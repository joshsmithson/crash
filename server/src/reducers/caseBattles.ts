/**
 * Case Battles Reducers - Multiplayer case opening battles.
 *
 * Game Flow:
 * 1. Creator calls createCaseBattle(mode, caseIds) - selects cases and mode.
 *    Creator's share of the cost is locked immediately. Creator joins slot 0.
 * 2. Other players call joinCaseBattle(battleId) - locks their share.
 * 3. When all slots are filled, startCaseBattle() auto-resolves:
 *    - Each round opens one case for all players simultaneously.
 *    - Items are determined by provably fair hashing.
 *    - Player with highest total value wins the entire pot.
 *
 * Modes:
 * - 1v1:       2 players, 2 slots
 * - 1v1v1:     3 players, 3 slots
 * - 1v1v1v1:   4 players, 4 slots
 * - 2v2:       4 players, 4 slots (teams of 2)
 *
 * The total cost = sum of all case prices * number of players.
 * Each player pays: sum of all case prices.
 * Winner receives: total value of ALL items opened across ALL players.
 */

import { reducer, ReducerContext, Identity } from '@clockworklabs/spacetimedb-sdk';
import {
  CaseBattles,
  CaseBattlePlayers,
  CaseBattleRounds,
  Cases,
  CaseItems,
  CaseBattleMode,
  CaseBattleStatus,
  CaseBattleRoundStatus,
  GameType,
  TransactionType,
  ZERO_IDENTITY,
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
  requireActiveUser,
} from './credits';
import { consumeNonce, getClientSeed } from './seeds';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum cases per battle (rounds) */
const MAX_CASES_PER_BATTLE = 10;

/** Minimum cases per battle */
const MIN_CASES_PER_BATTLE = 1;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the number of player slots for a battle mode.
 */
function getSlotsForMode(mode: string): number {
  switch (mode) {
    case CaseBattleMode.OneVsOne:
      return 2;
    case CaseBattleMode.OneVsOneVsOne:
      return 3;
    case CaseBattleMode.OneVsOneVsOneVsOne:
    case CaseBattleMode.TwoVsTwo:
      return 4;
    default:
      throw new Error(`Invalid battle mode: ${mode}`);
  }
}

/**
 * Get all players for a battle.
 */
function getPlayersForBattle(battleId: number): InstanceType<typeof CaseBattlePlayers>[] {
  const players: InstanceType<typeof CaseBattlePlayers>[] = [];
  for (const player of CaseBattlePlayers.iter()) {
    if (player.battleId === battleId) {
      players.push(player);
    }
  }
  return players;
}

/**
 * Get all rounds for a battle.
 */
function getRoundsForBattle(battleId: number): InstanceType<typeof CaseBattleRounds>[] {
  const rounds: InstanceType<typeof CaseBattleRounds>[] = [];
  for (const round of CaseBattleRounds.iter()) {
    if (round.battleId === battleId) {
      rounds.push(round);
    }
  }
  // Sort by round number
  rounds.sort((a, b) => a.roundNumber - b.roundNumber);
  return rounds;
}

/**
 * Get all items for a case.
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
 * Roll an item from a case using a hash.
 */
function rollItem(
  hash: string,
  items: InstanceType<typeof CaseItems>[],
): InstanceType<typeof CaseItems> {
  let totalWeight = 0;
  for (const item of items) {
    totalWeight += item.weight;
  }

  const roll = caseRollFromHash(hash, totalWeight);
  let accumulated = 0;
  for (const item of items) {
    accumulated += item.weight;
    if (roll < accumulated) {
      return item;
    }
  }
  return items[items.length - 1];
}

function identitiesEqual(a: Identity, b: Identity): boolean {
  return (a as unknown as string) === (b as unknown as string);
}

// ─── Reducers ───────────────────────────────────────────────────────────────

/**
 * Create a new case battle.
 *
 * The creator selects a mode and an ordered list of case IDs (one per round).
 * The creator pays their share and joins slot 0.
 *
 * @param ctx - Reducer context
 * @param mode - Battle mode: "1v1", "1v1v1", "1v1v1v1", "2v2"
 * @param caseIds - Array of case IDs, one per round
 */
@reducer
export function createCaseBattle(
  ctx: ReducerContext,
  mode: string,
  caseIds: number[],
): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  // Validate mode
  const totalSlots = getSlotsForMode(mode); // throws if invalid

  // Validate case IDs
  if (caseIds.length < MIN_CASES_PER_BATTLE) {
    throw new Error(`Must select at least ${MIN_CASES_PER_BATTLE} case(s)`);
  }
  if (caseIds.length > MAX_CASES_PER_BATTLE) {
    throw new Error(`Maximum ${MAX_CASES_PER_BATTLE} cases per battle`);
  }

  // Calculate per-player cost (sum of all case prices)
  let perPlayerCost = 0n;
  const validatedCases: InstanceType<typeof Cases>[] = [];

  for (const caseId of caseIds) {
    const caseData = Cases.filterById(caseId);
    if (!caseData) {
      throw new Error(`Case not found: ${caseId}`);
    }
    if (!caseData.isActive) {
      throw new Error(`Case is not active: ${caseData.name}`);
    }
    const items = getItemsForCase(caseId);
    if (items.length === 0) {
      throw new Error(`Case has no items: ${caseData.name}`);
    }
    perPlayerCost += caseData.price;
    validatedCases.push(caseData);
  }

  const totalCost = perPlayerCost * BigInt(totalSlots);
  const now = nowMs();

  // Deduct creator's share
  const newBalance = deductBalance(callerIdentity, perPlayerCost);
  trackWager(callerIdentity, perPlayerCost);

  recordTransaction(
    callerIdentity,
    TransactionType.BattleLock,
    -perPlayerCost,
    GameType.CaseBattle,
    0, // Battle ID assigned by autoInc
    newBalance,
  );

  // Create the battle
  const battle = new CaseBattles();
  battle.creatorIdentity = callerIdentity;
  battle.mode = mode;
  battle.totalCost = totalCost;
  battle.status = CaseBattleStatus.Waiting;
  battle.winnerIdentity = ZERO_IDENTITY;
  battle.seedData = '';
  battle.createdAt = now;
  CaseBattles.insert(battle);

  // We need the battle ID for related records.
  // SpacetimeDB autoInc returns the ID on insert. Access it from the inserted row.
  // For this implementation, we scan for the battle we just created.
  let battleId = 0;
  for (const b of CaseBattles.iter()) {
    if (
      identitiesEqual(b.creatorIdentity, callerIdentity) &&
      b.createdAt === now &&
      b.status === CaseBattleStatus.Waiting
    ) {
      battleId = b.id;
      break;
    }
  }

  // Add creator as player in slot 0
  const player = new CaseBattlePlayers();
  player.battleId = battleId;
  player.identity = callerIdentity;
  player.slot = 0;
  player.totalValue = 0n;
  player.isReady = true;
  CaseBattlePlayers.insert(player);

  // Create rounds (one per case)
  for (let i = 0; i < caseIds.length; i++) {
    const round = new CaseBattleRounds();
    round.battleId = battleId;
    round.roundNumber = i;
    round.caseId = caseIds[i];
    round.results = '{}'; // Empty results
    round.status = CaseBattleRoundStatus.Pending;
    CaseBattleRounds.insert(round);
  }
}

/**
 * Join an existing case battle.
 *
 * The joiner pays their share (same as the per-player cost)
 * and is assigned the next available slot.
 * If the battle is now full, it starts automatically.
 *
 * @param ctx - Reducer context
 * @param battleId - ID of the battle to join
 */
@reducer
export function joinCaseBattle(ctx: ReducerContext, battleId: number): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  const battle = CaseBattles.filterById(battleId);
  if (!battle) {
    throw new Error('Battle not found');
  }
  if (battle.status !== CaseBattleStatus.Waiting) {
    throw new Error('Battle is not accepting players');
  }

  const totalSlots = getSlotsForMode(battle.mode);
  const existingPlayers = getPlayersForBattle(battleId);

  // Check if already joined
  for (const p of existingPlayers) {
    if (identitiesEqual(p.identity, callerIdentity)) {
      throw new Error('You have already joined this battle');
    }
  }

  // Check if full
  if (existingPlayers.length >= totalSlots) {
    throw new Error('Battle is already full');
  }

  // Calculate per-player cost
  const rounds = getRoundsForBattle(battleId);
  let perPlayerCost = 0n;
  for (const round of rounds) {
    const caseData = Cases.filterById(round.caseId);
    if (caseData) {
      perPlayerCost += caseData.price;
    }
  }

  // Deduct joiner's share
  const newBalance = deductBalance(callerIdentity, perPlayerCost);
  trackWager(callerIdentity, perPlayerCost);

  recordTransaction(
    callerIdentity,
    TransactionType.BattleLock,
    -perPlayerCost,
    GameType.CaseBattle,
    battleId,
    newBalance,
  );

  // Assign next available slot
  const usedSlots = new Set(existingPlayers.map((p) => p.slot));
  let nextSlot = 0;
  for (let s = 0; s < totalSlots; s++) {
    if (!usedSlots.has(s)) {
      nextSlot = s;
      break;
    }
  }

  // Add player
  const player = new CaseBattlePlayers();
  player.battleId = battleId;
  player.identity = callerIdentity;
  player.slot = nextSlot;
  player.totalValue = 0n;
  player.isReady = true;
  CaseBattlePlayers.insert(player);

  // Check if battle is now full
  if (existingPlayers.length + 1 >= totalSlots) {
    // Auto-start the battle
    executeBattle(ctx, battleId);
  }
}

/**
 * Internal: Execute all rounds of a case battle and determine winner.
 */
function executeBattle(ctx: ReducerContext, battleId: number): void {
  const battle = CaseBattles.filterById(battleId);
  if (!battle) return;

  battle.status = CaseBattleStatus.InProgress;
  CaseBattles.updateById(battleId, battle);

  const players = getPlayersForBattle(battleId);
  const rounds = getRoundsForBattle(battleId);

  // Use creator's seed for provably fair outcomes
  const { serverSeed, nonce: baseNonce } = consumeNonce(
    battle.creatorIdentity,
    GameType.CaseBattle,
  );
  const clientSeed = getClientSeed(battle.creatorIdentity);

  // Process each round
  for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
    const round = rounds[roundIdx];
    const items = getItemsForCase(round.caseId);

    if (items.length === 0) continue;

    const roundResults: Record<number, { itemId: number; itemName: string; creditValue: string }> = {};

    // Roll for each player in this round
    for (const player of players) {
      // Each player-round combination gets a unique nonce
      const playerRoundNonce = baseNonce * 1000 + roundIdx * 10 + player.slot;
      const hash = generateOutcome(serverSeed.seed, clientSeed, playerRoundNonce);
      const wonItem = rollItem(hash, items);

      roundResults[player.slot] = {
        itemId: wonItem.id,
        itemName: wonItem.name,
        creditValue: wonItem.creditValue.toString(),
      };

      // Update player's total value
      player.totalValue += wonItem.creditValue;
    }

    // Update round with results
    round.results = JSON.stringify(roundResults);
    round.status = CaseBattleRoundStatus.Completed;
    CaseBattleRounds.updateById(round.id, round);
  }

  // Update all player totals in the database
  for (const player of players) {
    CaseBattlePlayers.updateById(player.id, player);
  }

  // Determine winner (highest total value)
  let winner = players[0];
  for (const player of players) {
    if (player.totalValue > winner.totalValue) {
      winner = player;
    }
  }

  // In case of a tie, first slot wins (by convention)
  // (Already handled since we iterate from slot 0)

  // Calculate total value across all players (winner receives all items' value)
  let totalValuePool = 0n;
  for (const player of players) {
    totalValuePool += player.totalValue;
  }

  // Update battle
  battle.status = CaseBattleStatus.Completed;
  battle.winnerIdentity = winner.identity;
  battle.seedData = buildSeedData(serverSeed.id, clientSeed, baseNonce);
  CaseBattles.updateById(battleId, battle);

  // Pay the winner the total value pool
  if (totalValuePool > 0n) {
    const winnerNewBalance = creditBalance(winner.identity, totalValuePool);
    trackWinnings(winner.identity, totalValuePool);

    recordTransaction(
      winner.identity,
      TransactionType.BattleWin,
      totalValuePool,
      GameType.CaseBattle,
      battleId,
      winnerNewBalance,
    );
  }
}

/**
 * Start a case battle manually.
 * Normally battles auto-start when full, but this allows forcing a start
 * if you want to proceed with fewer players (admin or creator only).
 *
 * @param ctx - Reducer context
 * @param battleId - ID of the battle to start
 */
@reducer
export function startCaseBattle(ctx: ReducerContext, battleId: number): void {
  const callerIdentity = ctx.sender;

  const battle = CaseBattles.filterById(battleId);
  if (!battle) {
    throw new Error('Battle not found');
  }
  if (battle.status !== CaseBattleStatus.Waiting) {
    throw new Error('Battle is not in waiting state');
  }
  if (!identitiesEqual(battle.creatorIdentity, callerIdentity)) {
    throw new Error('Only the battle creator can manually start');
  }

  const players = getPlayersForBattle(battleId);
  const totalSlots = getSlotsForMode(battle.mode);

  if (players.length < totalSlots) {
    throw new Error(
      `Battle needs ${totalSlots} players but only has ${players.length}`,
    );
  }

  executeBattle(ctx, battleId);
}

/**
 * Leave a case battle before it starts.
 * Refunds the player's locked credits.
 *
 * @param ctx - Reducer context
 * @param battleId - ID of the battle to leave
 */
@reducer
export function leaveCaseBattle(ctx: ReducerContext, battleId: number): void {
  const callerIdentity = ctx.sender;

  const battle = CaseBattles.filterById(battleId);
  if (!battle) {
    throw new Error('Battle not found');
  }
  if (battle.status !== CaseBattleStatus.Waiting) {
    throw new Error('Cannot leave a battle that has already started');
  }

  // Find the player's record
  const players = getPlayersForBattle(battleId);
  let playerRecord: InstanceType<typeof CaseBattlePlayers> | null = null;
  for (const p of players) {
    if (identitiesEqual(p.identity, callerIdentity)) {
      playerRecord = p;
      break;
    }
  }

  if (!playerRecord) {
    throw new Error('You are not in this battle');
  }

  // If the creator leaves, cancel the entire battle and refund everyone
  if (identitiesEqual(battle.creatorIdentity, callerIdentity)) {
    // Refund all players
    const rounds = getRoundsForBattle(battleId);
    let perPlayerCost = 0n;
    for (const round of rounds) {
      const caseData = Cases.filterById(round.caseId);
      if (caseData) {
        perPlayerCost += caseData.price;
      }
    }

    for (const p of players) {
      const refundBalance = creditBalance(p.identity, perPlayerCost);
      recordTransaction(
        p.identity,
        TransactionType.BattleRefund,
        perPlayerCost,
        GameType.CaseBattle,
        battleId,
        refundBalance,
      );
      // Remove player record
      CaseBattlePlayers.deleteById(p.id);
    }

    // Cancel the battle
    battle.status = CaseBattleStatus.Cancelled;
    CaseBattles.updateById(battleId, battle);
    return;
  }

  // Non-creator leaving: just refund them and remove
  const rounds = getRoundsForBattle(battleId);
  let perPlayerCost = 0n;
  for (const round of rounds) {
    const caseData = Cases.filterById(round.caseId);
    if (caseData) {
      perPlayerCost += caseData.price;
    }
  }

  const refundBalance = creditBalance(callerIdentity, perPlayerCost);
  recordTransaction(
    callerIdentity,
    TransactionType.BattleRefund,
    perPlayerCost,
    GameType.CaseBattle,
    battleId,
    refundBalance,
  );

  // Remove the player
  CaseBattlePlayers.deleteById(playerRecord.id);
}
