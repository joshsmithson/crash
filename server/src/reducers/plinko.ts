/**
 * Plinko Reducers - Ball-drop plinko game.
 *
 * A ball drops through a grid of pegs, going left or right at each row.
 * The final bucket determines the multiplier applied to the bet.
 *
 * Configuration:
 * - Rows: 8, 12, or 16
 * - Risk: low, medium, high
 *
 * Each combination has its own multiplier table.
 * The path is determined by provably fair hashing.
 *
 * Bucket Index = number of R (right) turns in the path.
 * For N rows, there are N+1 buckets (0 to N).
 * Multiplier tables are symmetric around the center.
 */

import { reducer, ReducerContext } from '@clockworklabs/spacetimedb-sdk';
import {
  PlinkoDrops,
  PlinkoRiskLevel,
  GameType,
  TransactionType,
  nowMs,
} from '../tables';
import {
  plinkoPathFromHash,
  plinkoBucketFromPath,
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

/** Minimum bet in cents */
const MIN_BET = 10n; // $0.10

/** Maximum bet in cents */
const MAX_BET = 10_000_00n; // $10,000

/** Valid row counts */
const VALID_ROWS = [8, 12, 16];

// ─── Multiplier Tables ─────────────────────────────────────────────────────
//
// Each table has (rows + 1) entries, indexed by bucket.
// Buckets are symmetric: bucket[i] = bucket[rows - i].
// These tables are standard plinko multipliers used by major platforms.
//
// Format: multiplierTables[risk][rows] = [bucket0, bucket1, ..., bucketN]

type MultiplierTable = Record<string, Record<number, number[]>>;

const MULTIPLIER_TABLES: MultiplierTable = {
  // ─── Low Risk ───────────────────────────────────
  [PlinkoRiskLevel.Low]: {
    // 8 rows, 9 buckets
    8: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    // 12 rows, 13 buckets
    12: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 0.3, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    // 16 rows, 17 buckets
    16: [16.0, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16.0],
  },

  // ─── Medium Risk ────────────────────────────────
  [PlinkoRiskLevel.Medium]: {
    // 8 rows, 9 buckets
    8: [13.0, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13.0],
    // 12 rows, 13 buckets
    12: [33.0, 11.0, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11.0, 33.0],
    // 16 rows, 17 buckets
    16: [110.0, 41.0, 10.0, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10.0, 41.0, 110.0],
  },

  // ─── High Risk ──────────────────────────────────
  [PlinkoRiskLevel.High]: {
    // 8 rows, 9 buckets
    8: [29.0, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29.0],
    // 12 rows, 13 buckets
    12: [170.0, 24.0, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24.0, 170.0],
    // 16 rows, 17 buckets
    16: [1000.0, 130.0, 26.0, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26.0, 130.0, 1000.0],
  },
};

/**
 * Get the multiplier for a given risk, rows, and bucket.
 */
function getMultiplier(risk: string, rows: number, bucket: number): number {
  const table = MULTIPLIER_TABLES[risk];
  if (!table) {
    throw new Error(`Invalid risk level: ${risk}`);
  }
  const rowTable = table[rows];
  if (!rowTable) {
    throw new Error(`Invalid row count: ${rows}`);
  }
  if (bucket < 0 || bucket >= rowTable.length) {
    throw new Error(`Invalid bucket: ${bucket}`);
  }
  return rowTable[bucket];
}

// ─── Reducers ───────────────────────────────────────────────────────────────

/**
 * Drop a plinko ball.
 *
 * Generates a provably fair path, determines the landing bucket,
 * looks up the multiplier, and credits/debits accordingly.
 *
 * @param ctx - Reducer context
 * @param amount - Bet amount in cents
 * @param riskLevel - "low", "medium", or "high"
 * @param rows - Number of rows: 8, 12, or 16
 */
@reducer
export function dropPlinko(
  ctx: ReducerContext,
  amount: bigint,
  riskLevel: string,
  rows: number,
): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  // Validate amount
  if (amount < MIN_BET) {
    throw new Error(`Minimum bet is ${MIN_BET} cents`);
  }
  if (amount > MAX_BET) {
    throw new Error(`Maximum bet is ${MAX_BET} cents`);
  }

  // Validate risk level
  if (
    riskLevel !== PlinkoRiskLevel.Low &&
    riskLevel !== PlinkoRiskLevel.Medium &&
    riskLevel !== PlinkoRiskLevel.High
  ) {
    throw new Error('Risk level must be "low", "medium", or "high"');
  }

  // Validate rows
  if (!VALID_ROWS.includes(rows)) {
    throw new Error('Rows must be 8, 12, or 16');
  }
  if (!Number.isInteger(rows)) {
    throw new Error('Rows must be an integer');
  }

  const now = nowMs();

  // Deduct bet
  const newBalanceAfterBet = deductBalance(callerIdentity, amount);
  trackWager(callerIdentity, amount);

  // Generate provably fair path
  const { serverSeed, nonce } = consumeNonce(callerIdentity, GameType.Plinko);
  const clientSeed = getClientSeed(callerIdentity);
  const path = plinkoPathFromHash(serverSeed.seed, clientSeed, nonce, rows);

  // Determine bucket and multiplier
  const bucket = plinkoBucketFromPath(path);
  const multiplier = getMultiplier(riskLevel, rows, bucket);

  // Calculate payout
  // Payout = floor(amount * multiplier)
  const payout = BigInt(Math.floor(Number(amount) * multiplier));

  // Record the bet transaction
  recordTransaction(
    callerIdentity,
    TransactionType.BetPlaced,
    -amount,
    GameType.Plinko,
    0,
    newBalanceAfterBet,
  );

  // Credit payout (if any)
  let finalBalance = newBalanceAfterBet;
  if (payout > 0n) {
    finalBalance = creditBalance(callerIdentity, payout);
    trackWinnings(callerIdentity, payout);

    recordTransaction(
      callerIdentity,
      TransactionType.BetWon,
      payout,
      GameType.Plinko,
      0,
      finalBalance,
    );
  } else {
    recordTransaction(
      callerIdentity,
      TransactionType.BetLost,
      -amount,
      GameType.Plinko,
      0,
      finalBalance,
    );
  }

  // Record the drop
  const drop = new PlinkoDrops();
  drop.identity = callerIdentity;
  drop.amount = amount;
  drop.riskLevel = riskLevel;
  drop.rows = rows;
  drop.path = JSON.stringify(path);
  drop.multiplier = multiplier;
  drop.payout = payout;
  drop.seedData = buildSeedData(serverSeed.id, clientSeed, nonce);
  drop.createdAt = now;
  PlinkoDrops.insert(drop);
}
