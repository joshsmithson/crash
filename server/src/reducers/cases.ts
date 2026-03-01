/**
 * Cases Reducers - CS2-style case opening.
 *
 * Cases contain weighted items. Players pay the case price to open,
 * receiving a random item determined by provably fair hashing.
 * The item's credit value is immediately added to their balance.
 *
 * Admin reducers manage case definitions and items.
 *
 * Probability is determined by item weights:
 *   P(item) = item.weight / sum(all_item_weights_in_case)
 */

import { reducer, ReducerContext, Identity } from '@clockworklabs/spacetimedb-sdk';
import {
  Cases,
  CaseItems,
  CaseOpenings,
  GameType,
  TransactionType,
  ItemRarity,
  nowMs,
} from '../tables';
import {
  generateOutcome,
  caseRollFromHash,
  buildSeedData,
} from '../provablyFair';
import {
  deductBalance,
  creditBalance,
  recordTransaction,
  trackWager,
  trackWinnings,
  requireAdmin,
  requireActiveUser,
} from './credits';
import { consumeNonce, getClientSeed } from './seeds';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum items per case */
const MAX_ITEMS_PER_CASE = 50;

/** Maximum case name length */
const MAX_NAME_LENGTH = 64;

/** Maximum image URL length */
const MAX_URL_LENGTH = 512;

/** Maximum category name length */
const MAX_CATEGORY_LENGTH = 32;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get all items belonging to a case.
 */
function getItemsForCase(caseId: number): InstanceType<typeof CaseItems>[] {
  const items: InstanceType<typeof CaseItems>[] = [];
  for (const item of CaseItems.iter()) {
    if (item.caseId === caseId) {
      items.push(item);
    }
  }
  return items;
}

/**
 * Calculate the total weight of all items in a case.
 */
function getTotalWeight(items: InstanceType<typeof CaseItems>[]): number {
  let total = 0;
  for (const item of items) {
    total += item.weight;
  }
  return total;
}

/**
 * Given a roll number and items sorted by weight accumulation,
 * determine which item was won.
 *
 * @param roll - Random number in [0, totalWeight)
 * @param items - Case items
 * @returns The won item
 */
function getItemFromRoll(
  roll: number,
  items: InstanceType<typeof CaseItems>[],
): InstanceType<typeof CaseItems> {
  let accumulated = 0;
  for (const item of items) {
    accumulated += item.weight;
    if (roll < accumulated) {
      return item;
    }
  }
  // Fallback to last item (should never happen with correct math)
  return items[items.length - 1];
}

// ─── Player Reducers ────────────────────────────────────────────────────────

/**
 * Open a case.
 *
 * Deducts the case price, generates a provably fair roll,
 * determines the won item, and credits the item's value.
 *
 * @param ctx - Reducer context
 * @param caseId - ID of the case to open
 */
@reducer
export function openCase(ctx: ReducerContext, caseId: number): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  // Find the case
  const caseData = Cases.filterById(caseId);
  if (!caseData) {
    throw new Error('Case not found');
  }
  if (!caseData.isActive) {
    throw new Error('This case is currently unavailable');
  }

  // Get case items
  const items = getItemsForCase(caseId);
  if (items.length === 0) {
    throw new Error('Case has no items');
  }

  const totalWeight = getTotalWeight(items);
  if (totalWeight === 0) {
    throw new Error('Case has invalid item weights');
  }

  // Deduct the case price
  const newBalanceAfterDeduct = deductBalance(callerIdentity, caseData.price);
  trackWager(callerIdentity, caseData.price);

  recordTransaction(
    callerIdentity,
    TransactionType.CaseOpen,
    -caseData.price,
    GameType.Cases,
    caseId,
    newBalanceAfterDeduct,
  );

  // Generate provably fair outcome
  const { serverSeed, nonce } = consumeNonce(callerIdentity, GameType.Cases);
  const clientSeed = getClientSeed(callerIdentity);
  const outcomeHash = generateOutcome(serverSeed.seed, clientSeed, nonce);
  const roll = caseRollFromHash(outcomeHash, totalWeight);

  // Determine won item
  const wonItem = getItemFromRoll(roll, items);

  // Credit the item's value
  const newBalanceAfterWin = creditBalance(callerIdentity, wonItem.creditValue);
  trackWinnings(callerIdentity, wonItem.creditValue);

  recordTransaction(
    callerIdentity,
    TransactionType.CaseWin,
    wonItem.creditValue,
    GameType.Cases,
    caseId,
    newBalanceAfterWin,
  );

  // Record the opening
  const opening = new CaseOpenings();
  opening.identity = callerIdentity;
  opening.caseId = caseId;
  opening.wonItemId = wonItem.id;
  opening.creditValue = wonItem.creditValue;
  opening.seedData = buildSeedData(serverSeed.id, clientSeed, nonce);
  opening.createdAt = nowMs();
  CaseOpenings.insert(opening);
}

// ─── Admin Reducers ─────────────────────────────────────────────────────────

/**
 * Admin: Create a new case definition.
 *
 * @param ctx - Reducer context
 * @param name - Case name
 * @param imageUrl - URL of the case image
 * @param price - Price in cents to open
 * @param category - Category label (e.g. "weapon", "knife", "gloves")
 */
@reducer
export function adminCreateCase(
  ctx: ReducerContext,
  name: string,
  imageUrl: string,
  price: bigint,
  category: string,
): void {
  requireAdmin(ctx.sender);

  // Validate inputs
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new Error(`Case name must be 1-${MAX_NAME_LENGTH} characters`);
  }
  if (imageUrl.length > MAX_URL_LENGTH) {
    throw new Error(`Image URL must be at most ${MAX_URL_LENGTH} characters`);
  }
  if (price <= 0n) {
    throw new Error('Case price must be positive');
  }
  if (category.length === 0 || category.length > MAX_CATEGORY_LENGTH) {
    throw new Error(`Category must be 1-${MAX_CATEGORY_LENGTH} characters`);
  }

  const caseData = new Cases();
  caseData.name = name;
  caseData.imageUrl = imageUrl;
  caseData.price = price;
  caseData.isActive = false; // Inactive until items are added
  caseData.category = category;
  Cases.insert(caseData);
}

/**
 * Admin: Add an item to a case.
 *
 * @param ctx - Reducer context
 * @param caseId - ID of the case
 * @param name - Item name (e.g. "AK-47 | Redline")
 * @param imageUrl - Item image URL
 * @param rarity - Item rarity tier
 * @param creditValue - Value in cents when won
 * @param weight - Probability weight (higher = more common)
 */
@reducer
export function adminAddCaseItem(
  ctx: ReducerContext,
  caseId: number,
  name: string,
  imageUrl: string,
  rarity: string,
  creditValue: bigint,
  weight: number,
): void {
  requireAdmin(ctx.sender);

  // Verify case exists
  const caseData = Cases.filterById(caseId);
  if (!caseData) {
    throw new Error('Case not found');
  }

  // Validate inputs
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new Error(`Item name must be 1-${MAX_NAME_LENGTH} characters`);
  }
  if (imageUrl.length > MAX_URL_LENGTH) {
    throw new Error(`Image URL must be at most ${MAX_URL_LENGTH} characters`);
  }

  // Validate rarity
  const validRarities = [
    ItemRarity.ConsumerGrade,
    ItemRarity.IndustrialGrade,
    ItemRarity.MilSpec,
    ItemRarity.Restricted,
    ItemRarity.Classified,
    ItemRarity.Covert,
    ItemRarity.Extraordinary,
  ];
  if (!validRarities.includes(rarity as ItemRarity)) {
    throw new Error(`Invalid rarity: ${rarity}`);
  }

  if (creditValue <= 0n) {
    throw new Error('Credit value must be positive');
  }
  if (weight <= 0) {
    throw new Error('Weight must be positive');
  }
  if (!Number.isInteger(weight)) {
    throw new Error('Weight must be an integer');
  }

  // Check item count limit
  const existingItems = getItemsForCase(caseId);
  if (existingItems.length >= MAX_ITEMS_PER_CASE) {
    throw new Error(`Case already has the maximum of ${MAX_ITEMS_PER_CASE} items`);
  }

  // Create the item
  const item = new CaseItems();
  item.caseId = caseId;
  item.name = name;
  item.imageUrl = imageUrl;
  item.rarity = rarity;
  item.creditValue = creditValue;
  item.weight = weight;
  CaseItems.insert(item);
}

/**
 * Admin: Toggle a case's active status.
 * A case must have at least one item to be activated.
 *
 * @param ctx - Reducer context
 * @param caseId - ID of the case to toggle
 * @param isActive - New active status
 */
@reducer
export function adminToggleCase(
  ctx: ReducerContext,
  caseId: number,
  isActive: boolean,
): void {
  requireAdmin(ctx.sender);

  const caseData = Cases.filterById(caseId);
  if (!caseData) {
    throw new Error('Case not found');
  }

  // If activating, ensure case has items
  if (isActive) {
    const items = getItemsForCase(caseId);
    if (items.length === 0) {
      throw new Error('Cannot activate a case with no items');
    }
  }

  caseData.isActive = isActive;
  Cases.updateById(caseId, caseData);
}
