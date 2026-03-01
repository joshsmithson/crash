/**
 * Coin Flip Reducers - Peer-to-peer coin flip game.
 *
 * Game Flow:
 * 1. Creator calls createCoinFlip(amount, side) - locks their credits.
 * 2. A joiner calls joinCoinFlip(flipId) - locks their credits, immediately resolves.
 * 3. Result is determined using provably fair hashing.
 * 4. Winner receives (total pot * 0.95) -- 5% house edge.
 * 5. Creator can cancelCoinFlip() before someone joins for a full refund.
 *
 * House Edge: 5% of total pot (deducted from winner's payout).
 */

import { reducer, ReducerContext, Identity } from '@clockworklabs/spacetimedb-sdk';
import {
  CoinFlips,
  CoinFlipSide,
  CoinFlipStatus,
  GameType,
  TransactionType,
  ZERO_IDENTITY,
  nowMs,
} from '../tables';
import {
  generateOutcome,
  coinFlipFromHash,
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

/** Minimum coin flip amount in cents */
const MIN_AMOUNT = 100n; // $1.00

/** Maximum coin flip amount in cents */
const MAX_AMOUNT = 50_000_00n; // $50,000

/** House edge as a fraction (5%) */
const HOUSE_EDGE_NUMERATOR = 95n;
const HOUSE_EDGE_DENOMINATOR = 100n;

// ─── Helpers ────────────────────────────────────────────────────────────────

function isZeroIdentity(identity: Identity): boolean {
  // Check if identity is the zero/sentinel value
  const bytes = identity as unknown as Uint8Array;
  if (bytes && bytes.length) {
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== 0) return false;
    }
    return true;
  }
  // Fallback: string comparison
  return (identity as unknown as string) === (ZERO_IDENTITY as unknown as string);
}

function identitiesEqual(a: Identity, b: Identity): boolean {
  return (a as unknown as string) === (b as unknown as string);
}

// ─── Reducers ───────────────────────────────────────────────────────────────

/**
 * Create a new coin flip game.
 *
 * The creator chooses a side (CT or T) and an amount.
 * Credits are immediately locked (deducted from balance).
 * The game waits for a joiner.
 *
 * @param ctx - Reducer context
 * @param amount - Wager amount in cents
 * @param side - Creator's chosen side: "ct" or "t"
 */
@reducer
export function createCoinFlip(
  ctx: ReducerContext,
  amount: bigint,
  side: string,
): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  // Validate amount
  if (amount < MIN_AMOUNT) {
    throw new Error(`Minimum coin flip amount is ${MIN_AMOUNT} cents`);
  }
  if (amount > MAX_AMOUNT) {
    throw new Error(`Maximum coin flip amount is ${MAX_AMOUNT} cents`);
  }

  // Validate side
  if (side !== CoinFlipSide.CT && side !== CoinFlipSide.T) {
    throw new Error('Side must be "ct" or "t"');
  }

  const now = nowMs();

  // Lock creator's credits
  const newBalance = deductBalance(callerIdentity, amount);
  trackWager(callerIdentity, amount);

  recordTransaction(
    callerIdentity,
    TransactionType.CoinFlipLock,
    -amount,
    GameType.CoinFlip,
    0, // gameRoundId will be updated after insert
    newBalance,
  );

  // Create the coin flip game
  const flip = new CoinFlips();
  flip.creatorIdentity = callerIdentity;
  flip.joinerIdentity = ZERO_IDENTITY;
  flip.amount = amount;
  flip.creatorSide = side;
  flip.result = '';
  flip.winnerIdentity = ZERO_IDENTITY;
  flip.seedData = '';
  flip.status = CoinFlipStatus.Waiting;
  flip.createdAt = now;
  flip.completedAt = 0n;
  CoinFlips.insert(flip);
}

/**
 * Join an existing coin flip game.
 *
 * The joiner matches the creator's wager amount.
 * The game is immediately resolved using provably fair hashing.
 * Winner receives 95% of the total pot (5% house edge).
 *
 * @param ctx - Reducer context
 * @param flipId - ID of the coin flip game to join
 */
@reducer
export function joinCoinFlip(ctx: ReducerContext, flipId: number): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  // Find the flip
  const flip = CoinFlips.filterById(flipId);
  if (!flip) {
    throw new Error('Coin flip game not found');
  }
  if (flip.status !== CoinFlipStatus.Waiting) {
    throw new Error('Coin flip is not available to join');
  }
  if (identitiesEqual(flip.creatorIdentity, callerIdentity)) {
    throw new Error('You cannot join your own coin flip');
  }

  const now = nowMs();

  // Lock joiner's credits
  const joinerNewBalance = deductBalance(callerIdentity, flip.amount);
  trackWager(callerIdentity, flip.amount);

  recordTransaction(
    callerIdentity,
    TransactionType.CoinFlipLock,
    -flip.amount,
    GameType.CoinFlip,
    flipId,
    joinerNewBalance,
  );

  // Update flip with joiner
  flip.joinerIdentity = callerIdentity;

  // Determine the result using provably fair hashing
  // Use the creator's seed data for the flip
  const { serverSeed, nonce } = consumeNonce(
    flip.creatorIdentity,
    GameType.CoinFlip,
  );
  const clientSeed = getClientSeed(flip.creatorIdentity);
  const outcomeHash = generateOutcome(serverSeed.seed, clientSeed, nonce);
  const result = coinFlipFromHash(outcomeHash);

  // Determine winner
  const creatorWins = result === flip.creatorSide;
  const winnerIdentity = creatorWins ? flip.creatorIdentity : callerIdentity;
  const loserIdentity = creatorWins ? callerIdentity : flip.creatorIdentity;

  // Calculate payout with 5% house edge
  const totalPot = flip.amount * 2n;
  const winnerPayout = (totalPot * HOUSE_EDGE_NUMERATOR) / HOUSE_EDGE_DENOMINATOR;

  // Update flip record
  flip.result = result;
  flip.winnerIdentity = winnerIdentity;
  flip.seedData = buildSeedData(serverSeed.id, clientSeed, nonce);
  flip.status = CoinFlipStatus.Completed;
  flip.completedAt = now;
  CoinFlips.updateById(flipId, flip);

  // Pay the winner
  const winnerNewBalance = creditBalance(winnerIdentity, winnerPayout);
  trackWinnings(winnerIdentity, winnerPayout);

  recordTransaction(
    winnerIdentity,
    TransactionType.CoinFlipWin,
    winnerPayout,
    GameType.CoinFlip,
    flipId,
    winnerNewBalance,
  );

  // Record loss for the loser (balance was already deducted)
  recordTransaction(
    loserIdentity,
    TransactionType.BetLost,
    -flip.amount,
    GameType.CoinFlip,
    flipId,
    0n, // Balance was deducted when they created/joined
  );
}

/**
 * Cancel a waiting coin flip and refund the creator.
 * Only the creator can cancel, and only before someone joins.
 *
 * @param ctx - Reducer context
 * @param flipId - ID of the coin flip to cancel
 */
@reducer
export function cancelCoinFlip(ctx: ReducerContext, flipId: number): void {
  const callerIdentity = ctx.sender;

  const flip = CoinFlips.filterById(flipId);
  if (!flip) {
    throw new Error('Coin flip game not found');
  }
  if (flip.status !== CoinFlipStatus.Waiting) {
    throw new Error('Coin flip cannot be cancelled (already completed or cancelled)');
  }
  if (!identitiesEqual(flip.creatorIdentity, callerIdentity)) {
    throw new Error('Only the creator can cancel this coin flip');
  }

  // Refund the creator
  const newBalance = creditBalance(callerIdentity, flip.amount);

  recordTransaction(
    callerIdentity,
    TransactionType.CoinFlipRefund,
    flip.amount,
    GameType.CoinFlip,
    flipId,
    newBalance,
  );

  // Mark as cancelled
  flip.status = CoinFlipStatus.Cancelled;
  flip.completedAt = nowMs();
  CoinFlips.updateById(flipId, flip);
}
