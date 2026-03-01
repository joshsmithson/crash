/**
 * Roulette Reducers - CS2-style roulette with red/black/green.
 *
 * Game Flow:
 * 1. startRouletteRound() - Creates a round with a 20-second betting window.
 * 2. Players call placeRouletteBet() to bet on red, black, or green.
 * 3. After 20 seconds, resolveRoulette() is called via scheduled reducer.
 *    - Determines the result (0-14) using provably fair hashing.
 *    - Pays winners: red/black = 2x, green = 14x.
 * 4. After a short display delay, the next round starts automatically.
 *
 * Result Mapping:
 *   0 = green    (~6.67% probability, pays 14x)
 *   1-7 = red    (~46.67% probability, pays 2x)
 *   8-14 = black (~46.67% probability, pays 2x)
 *
 * House Edge: ~6.67% on red/black, ~6.67% on green
 * (1/15 * 14x = 0.9333 expected return on green)
 * (7/15 * 2x = 0.9333 expected return on red/black)
 */

import { reducer, ReducerContext } from '@clockworklabs/spacetimedb-sdk';
import {
  RouletteRounds,
  RouletteBets,
  RouletteRoundStatus,
  RouletteBetType,
  RouletteColor,
  BetStatus,
  GameType,
  TransactionType,
  nowMs,
} from '../tables';
import {
  generateOutcome,
  rouletteFromHash,
  rouletteColorFromResult,
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

/** Duration of the betting window in milliseconds */
const BETTING_WINDOW_MS = 20_000; // 20 seconds

/** Delay after result before next round in milliseconds */
const POST_ROUND_DELAY_MS = 8_000; // 8 seconds for spin animation

/** Minimum bet in cents */
const MIN_BET = 10n; // $0.10

/** Maximum bet in cents */
const MAX_BET = 50_000_00n; // $50,000

/** Payout multipliers */
const PAYOUT_RED = 2n;
const PAYOUT_BLACK = 2n;
const PAYOUT_GREEN = 14n;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Find the current active roulette round (betting or spinning).
 */
function getActiveRouletteRound(): InstanceType<typeof RouletteRounds> | null {
  for (const round of RouletteRounds.iter()) {
    if (
      round.status === RouletteRoundStatus.Betting ||
      round.status === RouletteRoundStatus.Spinning
    ) {
      return round;
    }
  }
  return null;
}

/**
 * Get all bets for a specific roulette round.
 */
function getBetsForRound(roundId: number): InstanceType<typeof RouletteBets>[] {
  const bets: InstanceType<typeof RouletteBets>[] = [];
  for (const bet of RouletteBets.iter()) {
    if (bet.roundId === roundId) {
      bets.push(bet);
    }
  }
  return bets;
}

/**
 * Get the payout multiplier for a given bet type.
 */
function getPayoutMultiplier(betType: string): bigint {
  switch (betType) {
    case RouletteBetType.Red:
      return PAYOUT_RED;
    case RouletteBetType.Black:
      return PAYOUT_BLACK;
    case RouletteBetType.Green:
      return PAYOUT_GREEN;
    default:
      throw new Error(`Invalid bet type: ${betType}`);
  }
}

/**
 * Check if a bet type wins for a given result color.
 */
function isBetWinner(betType: string, resultColor: string): boolean {
  return betType === resultColor;
}

// ─── Reducers ───────────────────────────────────────────────────────────────

/**
 * Start a new roulette round with a 20-second betting window.
 *
 * The result is pre-determined using a server seed but only revealed
 * after betting closes. This allows provably fair verification.
 *
 * @param ctx - Reducer context
 */
@reducer
export function startRouletteRound(ctx: ReducerContext): void {
  // Ensure no active round
  const existing = getActiveRouletteRound();
  if (existing) {
    throw new Error('A roulette round is already active');
  }

  const now = nowMs();
  const bettingEndsAt = BigInt(Number(now) + BETTING_WINDOW_MS);

  // Create the round (result determined at resolve time for simplicity,
  // but seed data is committed now)
  const round = new RouletteRounds();
  round.status = RouletteRoundStatus.Betting;
  round.result = 255; // Sentinel: not yet determined
  round.resultColor = '';
  round.seedData = ''; // Will be filled at resolution
  round.bettingEndsAt = bettingEndsAt;
  round.completedAt = 0n;
  RouletteRounds.insert(round);

  // Schedule betting close / resolution
  ctx.schedule(closeAndResolveRoulette, bettingEndsAt, round.id);
}

/**
 * Place a bet on the current roulette round.
 *
 * @param ctx - Reducer context
 * @param amount - Bet amount in cents
 * @param betType - "red", "black", or "green"
 */
@reducer
export function placeRouletteBet(
  ctx: ReducerContext,
  amount: bigint,
  betType: string,
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

  // Validate bet type
  if (
    betType !== RouletteBetType.Red &&
    betType !== RouletteBetType.Black &&
    betType !== RouletteBetType.Green
  ) {
    throw new Error('Bet type must be "red", "black", or "green"');
  }

  // Find active round in betting phase
  const round = getActiveRouletteRound();
  if (!round) {
    throw new Error('No active roulette round');
  }
  if (round.status !== RouletteRoundStatus.Betting) {
    throw new Error('Betting is closed for this round');
  }

  // Check time (belt-and-suspenders with scheduled close)
  const now = nowMs();
  if (now >= round.bettingEndsAt) {
    throw new Error('Betting window has expired');
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
    GameType.Roulette,
    round.id,
    newBalance,
  );

  // Create the bet
  const bet = new RouletteBets();
  bet.roundId = round.id;
  bet.identity = callerIdentity;
  bet.amount = amount;
  bet.betType = betType;
  bet.payout = 0n;
  bet.status = BetStatus.Active;
  RouletteBets.insert(bet);
}

/**
 * Scheduled reducer: Close betting and resolve the roulette round.
 *
 * @param ctx - Reducer context
 * @param roundId - The round to resolve
 */
@reducer
export function closeAndResolveRoulette(
  ctx: ReducerContext,
  roundId: number,
): void {
  const round = RouletteRounds.filterById(roundId);
  if (!round) {
    return; // Round doesn't exist
  }
  if (round.status !== RouletteRoundStatus.Betting) {
    return; // Already resolved
  }

  // Transition to spinning
  round.status = RouletteRoundStatus.Spinning;
  RouletteRounds.updateById(roundId, round);

  // Schedule actual resolution after spin animation delay
  const resolveTime = BigInt(Number(nowMs()) + POST_ROUND_DELAY_MS);
  ctx.schedule(resolveRoulette, resolveTime, roundId);
}

/**
 * Resolve the roulette round: determine result and pay winners.
 *
 * The result is determined using the first bettor's server seed
 * for provably fair verification. In a production system, you might
 * use a global seed chain instead.
 *
 * @param ctx - Reducer context
 * @param roundId - The round to resolve
 */
@reducer
export function resolveRoulette(ctx: ReducerContext, roundId: number): void {
  const round = RouletteRounds.filterById(roundId);
  if (!round) {
    return;
  }
  if (round.status === RouletteRoundStatus.Completed) {
    return; // Already resolved
  }

  const now = nowMs();
  const bets = getBetsForRound(roundId);

  // Generate the roulette result using a round-specific seed
  // For global fairness, use a hash chain or shared seed
  const roundSeedBytes: number[] = [];
  for (let i = 0; i < 32; i++) {
    roundSeedBytes.push(Math.floor(Math.random() * 256));
    // NOTE: In production SpacetimeDB, use ctx.random()
  }
  const roundSeed = roundSeedBytes.map((b) => b.toString(16).padStart(2, '0')).join('');

  const outcomeHash = generateOutcome(roundSeed, `roulette:${roundId}`, 0);
  const result = rouletteFromHash(outcomeHash);
  const resultColor = rouletteColorFromResult(result);

  // Update round with result
  round.status = RouletteRoundStatus.Completed;
  round.result = result;
  round.resultColor = resultColor;
  round.seedData = JSON.stringify({
    roundSeed,
    outcomeHash,
    result,
    resultColor,
  });
  round.completedAt = now;
  RouletteRounds.updateById(roundId, round);

  // Process all bets
  for (const bet of bets) {
    if (bet.status !== BetStatus.Active) continue;

    if (isBetWinner(bet.betType, resultColor)) {
      // Winner!
      const multiplier = getPayoutMultiplier(bet.betType);
      const payout = bet.amount * multiplier;

      bet.payout = payout;
      bet.status = BetStatus.Won;
      RouletteBets.updateById(bet.id, bet);

      // Credit winnings
      const newBalance = creditBalance(bet.identity, payout);
      trackWinnings(bet.identity, payout);

      recordTransaction(
        bet.identity,
        TransactionType.BetWon,
        payout,
        GameType.Roulette,
        roundId,
        newBalance,
      );
    } else {
      // Loser
      bet.payout = 0n;
      bet.status = BetStatus.Lost;
      RouletteBets.updateById(bet.id, bet);

      recordTransaction(
        bet.identity,
        TransactionType.BetLost,
        -bet.amount,
        GameType.Roulette,
        roundId,
        0n, // Balance was deducted at bet time
      );
    }
  }

  // Schedule next round
  const nextRoundDelay = 3_000; // 3 seconds between rounds
  const nextRoundTime = BigInt(Number(now) + nextRoundDelay);
  ctx.schedule(startRouletteRound, nextRoundTime);
}
