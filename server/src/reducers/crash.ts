/**
 * Crash Game Reducers - The core crash gambling game.
 *
 * Game Flow:
 * 1. startCrashRound() - Creates a new round in "waiting" status.
 *    The crash point is pre-determined using provably fair crypto.
 * 2. Players call placeCrashBet() during the waiting phase.
 * 3. After a short delay, the round moves to "running" status.
 * 4. tickCrash() is called every 100ms via scheduled reducer.
 *    - Updates currentMultiplier using e^(elapsed * 0.00006)
 *    - Processes auto-cashouts
 *    - Checks if multiplier >= crashPoint
 * 5. Players can cashoutCrash() during the running phase.
 * 6. When multiplier >= crashPoint, resolveCrash() is called.
 *    - All remaining active bets are marked as lost.
 *    - Next round is scheduled after a delay.
 *
 * Multiplier Curve: multiplier = e^(elapsed_ms * 0.00006)
 * At 100ms: 1.006x, at 1s: 1.062x, at 10s: 1.822x, at 30s: 6.05x
 */

import { reducer, ReducerContext, ScheduleAt } from '@clockworklabs/spacetimedb-sdk';
import {
  CrashRounds,
  CrashBets,
  CrashRoundStatus,
  BetStatus,
  GameType,
  TransactionType,
  nowMs,
} from '../tables';
import {
  generateOutcome,
  crashPointFromHash,
  hashSeed,
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

/** Milliseconds between ticks during a running round */
const TICK_INTERVAL_MS = 100;

/** Growth rate constant for multiplier curve: e^(elapsed * GROWTH_RATE) */
const GROWTH_RATE = 0.00006;

/** Minimum bet amount in cents */
const MIN_BET = 10n; // $0.10

/** Maximum bet amount in cents */
const MAX_BET = 100_000_00n; // $100,000

/** Delay before round starts (waiting phase) in ms */
const ROUND_START_DELAY_MS = 5000; // 5 seconds

/** Delay before next round after crash in ms */
const NEXT_ROUND_DELAY_MS = 5000; // 5 seconds

/** House edge for crash point calculation */
const HOUSE_EDGE = 0.04; // 4%

// ─── Multiplier Calculation ─────────────────────────────────────────────────

/**
 * Calculate the current multiplier given elapsed time in milliseconds.
 * Formula: e^(elapsed * 0.00006)
 */
function calculateMultiplier(elapsedMs: number): number {
  return Math.exp(elapsedMs * GROWTH_RATE);
}

/**
 * Calculate elapsed time (ms) for a given multiplier.
 * Inverse: elapsed = ln(multiplier) / 0.00006
 */
function elapsedForMultiplier(multiplier: number): number {
  return Math.log(multiplier) / GROWTH_RATE;
}

// ─── Helper: Find active crash round ────────────────────────────────────────

/**
 * Find the current active crash round (waiting or running).
 * SpacetimeDB doesn't have complex queries, so we scan by status.
 */
function getActiveRound(): InstanceType<typeof CrashRounds> | null {
  // SpacetimeDB: scan CrashRounds for status = 'waiting' or 'running'
  // In practice, you would use an indexed scan or maintain a singleton
  // "current round" table. Here we iterate:
  for (const round of CrashRounds.iter()) {
    if (
      round.status === CrashRoundStatus.Waiting ||
      round.status === CrashRoundStatus.Running
    ) {
      return round;
    }
  }
  return null;
}

/**
 * Get all bets for a specific round.
 */
function getBetsForRound(roundId: number): InstanceType<typeof CrashBets>[] {
  const bets: InstanceType<typeof CrashBets>[] = [];
  for (const bet of CrashBets.iter()) {
    if (bet.roundId === roundId) {
      bets.push(bet);
    }
  }
  return bets;
}

// ─── Reducers ───────────────────────────────────────────────────────────────

/**
 * Start a new crash round.
 *
 * This is typically called automatically after the previous round completes,
 * or manually by an admin to kick off the first round.
 *
 * The crash point is pre-determined using a shared server seed
 * (not per-player) for crash games.
 *
 * @param ctx - Reducer context
 */
@reducer
export function startCrashRound(ctx: ReducerContext): void {
  // Ensure no active round exists
  const existing = getActiveRound();
  if (existing) {
    throw new Error('A crash round is already active');
  }

  const now = nowMs();

  // For crash, we use a global server seed approach.
  // Generate crash point from a combination of server randomness.
  // In a production system, this would use a chain of pre-committed hashes.
  const roundSeedHex = generateRoundSeed(ctx);
  const crashPoint = crashPointFromHash(roundSeedHex, HOUSE_EDGE);

  // Create the round
  const round = new CrashRounds();
  round.status = CrashRoundStatus.Waiting;
  round.crashPoint = crashPoint;
  round.crashPointHash = hashSeed(roundSeedHex);
  round.currentMultiplier = 1.0;
  round.startedAt = 0n;
  round.crashedAt = 0n;
  round.seedData = JSON.stringify({
    roundSeed: roundSeedHex,
    crashPoint: crashPoint,
  });
  CrashRounds.insert(round);

  // Schedule the round to start after the waiting period
  // SpacetimeDB scheduled reducers use ScheduleAt
  // After ROUND_START_DELAY_MS, call beginCrashRound to transition to running
  const startTime = BigInt(Number(now) + ROUND_START_DELAY_MS);
  ctx.schedule(beginCrashRound, startTime);
}

/**
 * Generate a round-specific seed using the reducer context's RNG.
 * This produces a deterministic seed that all validators agree on.
 */
function generateRoundSeed(ctx: ReducerContext): string {
  // Use context-provided randomness for consensus-safe seed generation
  // ctx.random() returns a deterministic random number agreed upon by all replicas
  const bytes: number[] = [];
  for (let i = 0; i < 32; i++) {
    bytes.push(Math.floor(Math.random() * 256));
    // NOTE: In production SpacetimeDB, replace Math.random() with ctx.random()
  }
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Scheduled reducer: Transition from waiting to running.
 * Called automatically after ROUND_START_DELAY_MS.
 */
@reducer
export function beginCrashRound(ctx: ReducerContext): void {
  const round = getActiveRound();
  if (!round || round.status !== CrashRoundStatus.Waiting) {
    return; // Round was cancelled or already started
  }

  const now = nowMs();
  round.status = CrashRoundStatus.Running;
  round.startedAt = now;
  round.currentMultiplier = 1.0;
  CrashRounds.updateById(round.id, round);

  // Mark all pending bets as active
  const bets = getBetsForRound(round.id);
  for (const bet of bets) {
    if (bet.status === BetStatus.Pending) {
      bet.status = BetStatus.Active;
      CrashBets.updateById(bet.id, bet);
    }
  }

  // Schedule the first tick
  const nextTickTime = BigInt(Number(now) + TICK_INTERVAL_MS);
  ctx.schedule(tickCrash, nextTickTime, round.id);
}

/**
 * Place a bet on the current crash round.
 * Only allowed during the waiting phase.
 *
 * @param ctx - Reducer context
 * @param amount - Bet amount in cents
 * @param autoCashoutAt - Optional auto-cashout multiplier (0 = disabled)
 */
@reducer
export function placeCrashBet(
  ctx: ReducerContext,
  amount: bigint,
  autoCashoutAt: number,
): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  // Validate bet amount
  if (amount < MIN_BET) {
    throw new Error(`Minimum bet is ${MIN_BET} cents`);
  }
  if (amount > MAX_BET) {
    throw new Error(`Maximum bet is ${MAX_BET} cents`);
  }

  // Validate auto-cashout
  if (autoCashoutAt !== 0 && autoCashoutAt < 1.01) {
    throw new Error('Auto-cashout must be at least 1.01x or disabled (0)');
  }

  // Find active round in waiting phase
  const round = getActiveRound();
  if (!round) {
    throw new Error('No active crash round');
  }
  if (round.status !== CrashRoundStatus.Waiting) {
    throw new Error('Betting is closed - round already in progress');
  }

  // Check for existing bet in this round
  const existingBets = getBetsForRound(round.id);
  for (const bet of existingBets) {
    if (
      (bet.identity as unknown as string) === (callerIdentity as unknown as string) &&
      bet.status !== BetStatus.Cancelled
    ) {
      throw new Error('You already have a bet in this round');
    }
  }

  // Deduct balance
  const newBalance = deductBalance(callerIdentity, amount);

  // Track wager
  trackWager(callerIdentity, amount);

  // Record transaction
  recordTransaction(
    callerIdentity,
    TransactionType.BetPlaced,
    -amount,
    GameType.Crash,
    round.id,
    newBalance,
  );

  // Create the bet
  const bet = new CrashBets();
  bet.roundId = round.id;
  bet.identity = callerIdentity;
  bet.amount = amount;
  bet.autoCashoutAt = autoCashoutAt;
  bet.cashedOutAt = 0;
  bet.profit = 0n;
  bet.status = BetStatus.Pending;
  CrashBets.insert(bet);
}

/**
 * Cash out of the current crash round.
 * Only allowed during the running phase for active bets.
 *
 * @param ctx - Reducer context
 */
@reducer
export function cashoutCrash(ctx: ReducerContext): void {
  const callerIdentity = ctx.sender;

  const round = getActiveRound();
  if (!round) {
    throw new Error('No active crash round');
  }
  if (round.status !== CrashRoundStatus.Running) {
    throw new Error('Round is not running');
  }

  // Find the caller's active bet
  const bets = getBetsForRound(round.id);
  let playerBet: InstanceType<typeof CrashBets> | null = null;
  for (const bet of bets) {
    if (
      (bet.identity as unknown as string) === (callerIdentity as unknown as string) &&
      bet.status === BetStatus.Active
    ) {
      playerBet = bet;
      break;
    }
  }

  if (!playerBet) {
    throw new Error('No active bet found in this round');
  }

  // Process the cashout at the current multiplier
  processCashout(playerBet, round.currentMultiplier, round.id);
}

/**
 * Internal: Process a cashout for a bet at a given multiplier.
 */
function processCashout(
  bet: InstanceType<typeof CrashBets>,
  multiplier: number,
  roundId: number,
): void {
  const payout = BigInt(Math.floor(Number(bet.amount) * multiplier));
  const profit = payout - bet.amount;

  bet.cashedOutAt = multiplier;
  bet.profit = profit;
  bet.status = BetStatus.CashedOut;
  CrashBets.updateById(bet.id, bet);

  // Credit winnings
  const newBalance = creditBalance(bet.identity, payout);

  // Track winnings
  trackWinnings(bet.identity, payout);

  // Record transaction
  recordTransaction(
    bet.identity,
    TransactionType.BetWon,
    payout,
    GameType.Crash,
    roundId,
    newBalance,
  );
}

/**
 * Scheduled reducer: Game tick during running phase.
 * Called every TICK_INTERVAL_MS.
 *
 * Updates the current multiplier, processes auto-cashouts,
 * and checks if the round should crash.
 *
 * @param ctx - Reducer context
 * @param roundId - The round to tick
 */
@reducer
export function tickCrash(ctx: ReducerContext, roundId: number): void {
  const round = CrashRounds.filterById(roundId);
  if (!round || round.status !== CrashRoundStatus.Running) {
    return; // Round ended or doesn't exist
  }

  const now = nowMs();
  const elapsedMs = Number(now - round.startedAt);

  // Calculate current multiplier
  const currentMultiplier = calculateMultiplier(elapsedMs);

  // Check if we've hit the crash point
  if (currentMultiplier >= round.crashPoint) {
    // The round has crashed
    round.currentMultiplier = round.crashPoint;
    CrashRounds.updateById(roundId, round);
    resolveCrash(ctx, roundId);
    return;
  }

  // Update the multiplier
  round.currentMultiplier = Math.floor(currentMultiplier * 100) / 100;
  CrashRounds.updateById(roundId, round);

  // Process auto-cashouts
  const bets = getBetsForRound(roundId);
  for (const bet of bets) {
    if (
      bet.status === BetStatus.Active &&
      bet.autoCashoutAt > 0 &&
      currentMultiplier >= bet.autoCashoutAt
    ) {
      // Auto-cashout at the specified multiplier
      processCashout(bet, bet.autoCashoutAt, roundId);
    }
  }

  // Schedule next tick
  const nextTickTime = BigInt(Number(now) + TICK_INTERVAL_MS);
  ctx.schedule(tickCrash, nextTickTime, roundId);
}

/**
 * Resolve a crashed round.
 * All remaining active bets are marked as lost.
 * Schedules the next round after a delay.
 *
 * @param ctx - Reducer context
 * @param roundId - The round to resolve
 */
@reducer
export function resolveCrash(ctx: ReducerContext, roundId: number): void {
  const round = CrashRounds.filterById(roundId);
  if (!round) {
    throw new Error('Round not found');
  }
  if (round.status === CrashRoundStatus.Crashed) {
    return; // Already resolved
  }

  const now = nowMs();

  // Update round status
  round.status = CrashRoundStatus.Crashed;
  round.crashedAt = now;
  round.currentMultiplier = round.crashPoint;
  CrashRounds.updateById(roundId, round);

  // Mark all remaining active bets as lost
  const bets = getBetsForRound(roundId);
  for (const bet of bets) {
    if (bet.status === BetStatus.Active) {
      bet.status = BetStatus.Lost;
      bet.profit = -bet.amount;
      CrashBets.updateById(bet.id, bet);

      // Record the loss transaction
      const bal = bet.amount; // They already lost this from deductBalance
      recordTransaction(
        bet.identity,
        TransactionType.BetLost,
        -bet.amount,
        GameType.Crash,
        roundId,
        0n, // Balance was already deducted when bet was placed
      );
    }
  }

  // Schedule the next round
  const nextRoundTime = BigInt(Number(now) + NEXT_ROUND_DELAY_MS);
  ctx.schedule(startCrashRound, nextRoundTime);
}
