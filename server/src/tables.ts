/**
 * SpacetimeDB Table Definitions for CS2 Gambling Platform
 *
 * Uses SpacetimeDB TypeScript module SDK patterns.
 * Tables are defined as decorated classes. The decorators register them
 * with SpacetimeDB's schema system and auto-generate CRUD helpers.
 *
 * SDK Reference: @clockworklabs/spacetimedb-sdk
 */

import {
  table,
  reducer,
  ReducerContext,
  Timestamp,
  Identity,
  ScheduleAt,
} from '@clockworklabs/spacetimedb-sdk';

// ─── Enumerations ───────────────────────────────────────────────────────────

export enum UserRole {
  User = 'user',
  Moderator = 'moderator',
  Admin = 'admin',
}

export enum TransactionType {
  Deposit = 'deposit',
  Withdrawal = 'withdrawal',
  BetPlaced = 'bet_placed',
  BetWon = 'bet_won',
  BetLost = 'bet_lost',
  CaseOpen = 'case_open',
  CaseWin = 'case_win',
  AdminGrant = 'admin_grant',
  AdminDeduct = 'admin_deduct',
  CoinFlipLock = 'coinflip_lock',
  CoinFlipRefund = 'coinflip_refund',
  CoinFlipWin = 'coinflip_win',
  BattleLock = 'battle_lock',
  BattleRefund = 'battle_refund',
  BattleWin = 'battle_win',
}

export enum GameType {
  Crash = 'crash',
  Roulette = 'roulette',
  CoinFlip = 'coinflip',
  Cases = 'cases',
  Plinko = 'plinko',
  CaseBattle = 'case_battle',
}

export enum CrashRoundStatus {
  Waiting = 'waiting',
  Running = 'running',
  Crashed = 'crashed',
}

export enum BetStatus {
  Pending = 'pending',
  Active = 'active',
  Won = 'won',
  Lost = 'lost',
  CashedOut = 'cashed_out',
  Cancelled = 'cancelled',
}

export enum RouletteRoundStatus {
  Betting = 'betting',
  Spinning = 'spinning',
  Completed = 'completed',
}

export enum RouletteColor {
  Red = 'red',
  Black = 'black',
  Green = 'green',
}

export enum RouletteBetType {
  Red = 'red',
  Black = 'black',
  Green = 'green',
}

export enum CoinFlipSide {
  CT = 'ct',
  T = 't',
}

export enum CoinFlipStatus {
  Waiting = 'waiting',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum ItemRarity {
  ConsumerGrade = 'consumer_grade',
  IndustrialGrade = 'industrial_grade',
  MilSpec = 'mil_spec',
  Restricted = 'restricted',
  Classified = 'classified',
  Covert = 'covert',
  Extraordinary = 'extraordinary',
}

export enum PlinkoRiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum CaseBattleMode {
  OneVsOne = '1v1',
  OneVsOneVsOne = '1v1v1',
  OneVsOneVsOneVsOne = '1v1v1v1',
  TwoVsTwo = '2v2',
}

export enum CaseBattleStatus {
  Waiting = 'waiting',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum CaseBattleRoundStatus {
  Pending = 'pending',
  Completed = 'completed',
}

// ─── Table Definitions ──────────────────────────────────────────────────────
//
// SpacetimeDB TypeScript module tables are defined as decorated classes.
// Each field with @column becomes a column. @primaryKey, @unique, @autoInc
// are used as field-level decorators.
//
// NOTE: SpacetimeDB stores tables in its built-in relational DB. Queries
// use generated filter helpers (e.g., Users.filterByIdentity(id)).

/**
 * Users - Core user identity and profile information.
 * Primary key: identity (SpacetimeDB Identity of the connected client)
 */
@table({ name: 'users', primaryKey: 'identity' })
export class Users {
  identity!: Identity;
  username!: string;
  displayName!: string;
  avatarUrl!: string;
  role!: string; // UserRole
  createdAt!: bigint; // Timestamp as epoch ms
  lastSeenAt!: bigint;
  isBanned!: boolean;
}

/**
 * Balances - User credit balances and lifetime stats.
 * All amounts are in integer cents (u64 via bigint).
 */
@table({ name: 'balances', primaryKey: 'identity' })
export class Balances {
  identity!: Identity;
  balance!: bigint; // u64 cents
  totalWagered!: bigint;
  totalWon!: bigint;
  totalDeposited!: bigint;
  totalWithdrawn!: bigint;
}

/**
 * Transactions - Immutable ledger of all balance-changing events.
 */
@table({ name: 'transactions', primaryKey: 'id' })
export class Transactions {
  id!: number; // @autoInc
  identity!: Identity;
  txType!: string; // TransactionType
  amount!: bigint; // i64 (can be negative for deductions)
  gameType!: string; // GameType or empty
  gameRoundId!: number;
  balanceAfter!: bigint;
  createdAt!: bigint;
}

/**
 * ServerSeeds - Provably fair server-side seeds.
 * Each user has one active seed per game type.
 * The seed is hidden until revealed (rotated).
 */
@table({ name: 'server_seeds', primaryKey: 'id' })
export class ServerSeeds {
  id!: number; // @autoInc
  identity!: Identity;
  seedHash!: string; // SHA-256 hash of seed (public)
  seed!: string; // Actual seed (hidden until revealed)
  nonce!: number;
  isActive!: boolean;
  gameType!: string; // GameType
  createdAt!: bigint;
  revealedAt!: bigint; // 0 if not yet revealed
}

/**
 * ClientSeeds - User-provided client seeds for provably fair verification.
 */
@table({ name: 'client_seeds', primaryKey: 'identity' })
export class ClientSeeds {
  identity!: Identity;
  seed!: string;
  updatedAt!: bigint;
}

/**
 * CrashRounds - State for each crash game round.
 */
@table({ name: 'crash_rounds', primaryKey: 'id' })
export class CrashRounds {
  id!: number; // @autoInc
  status!: string; // CrashRoundStatus
  crashPoint!: number; // f64 - the predetermined crash multiplier
  crashPointHash!: string; // Hash of crash point for verification
  currentMultiplier!: number; // f64 - live multiplier during the round
  startedAt!: bigint; // 0 if not started
  crashedAt!: bigint; // 0 if not crashed
  seedData!: string; // JSON: { serverSeedId, clientSeed, nonce }
}

/**
 * CrashBets - Individual bets within a crash round.
 */
@table({ name: 'crash_bets', primaryKey: 'id' })
export class CrashBets {
  id!: number; // @autoInc
  roundId!: number;
  identity!: Identity;
  amount!: bigint; // u64 cents
  autoCashoutAt!: number; // f64, 0 = no auto-cashout
  cashedOutAt!: number; // f64, 0 = not cashed out
  profit!: bigint; // i64 (negative if lost)
  status!: string; // BetStatus
}

/**
 * RouletteRounds - State for each roulette spin.
 * Result is 0-14: 0 = green, 1-7 = red, 8-14 = black.
 */
@table({ name: 'roulette_rounds', primaryKey: 'id' })
export class RouletteRounds {
  id!: number; // @autoInc
  status!: string; // RouletteRoundStatus
  result!: number; // u8 0-14, 255 = not determined
  resultColor!: string; // RouletteColor or empty
  seedData!: string;
  bettingEndsAt!: bigint;
  completedAt!: bigint; // 0 if not completed
}

/**
 * RouletteBets - Individual roulette bets.
 */
@table({ name: 'roulette_bets', primaryKey: 'id' })
export class RouletteBets {
  id!: number; // @autoInc
  roundId!: number;
  identity!: Identity;
  amount!: bigint;
  betType!: string; // RouletteBetType
  payout!: bigint; // 0 if not resolved
  status!: string; // BetStatus
}

/**
 * CoinFlips - Peer-to-peer coin flip games.
 */
@table({ name: 'coin_flips', primaryKey: 'id' })
export class CoinFlips {
  id!: number; // @autoInc
  creatorIdentity!: Identity;
  joinerIdentity!: Identity; // Zero-identity if no joiner yet
  amount!: bigint;
  creatorSide!: string; // CoinFlipSide
  result!: string; // CoinFlipSide or empty
  winnerIdentity!: Identity; // Zero-identity if not resolved
  seedData!: string;
  status!: string; // CoinFlipStatus
  createdAt!: bigint;
  completedAt!: bigint; // 0 if not completed
}

/**
 * Cases - Purchasable case definitions.
 */
@table({ name: 'cases', primaryKey: 'id' })
export class Cases {
  id!: number; // @autoInc
  name!: string;
  imageUrl!: string;
  price!: bigint;
  isActive!: boolean;
  category!: string;
}

/**
 * CaseItems - Items that can drop from a case.
 * Weight determines probability relative to total case weight.
 */
@table({ name: 'case_items', primaryKey: 'id' })
export class CaseItems {
  id!: number; // @autoInc
  caseId!: number;
  name!: string;
  imageUrl!: string;
  rarity!: string; // ItemRarity
  creditValue!: bigint;
  weight!: number; // u32
}

/**
 * CaseOpenings - Record of each case opening result.
 */
@table({ name: 'case_openings', primaryKey: 'id' })
export class CaseOpenings {
  id!: number; // @autoInc
  identity!: Identity;
  caseId!: number;
  wonItemId!: number;
  creditValue!: bigint;
  seedData!: string;
  createdAt!: bigint;
}

/**
 * PlinkoDrops - Record of each plinko ball drop.
 */
@table({ name: 'plinko_drops', primaryKey: 'id' })
export class PlinkoDrops {
  id!: number; // @autoInc
  identity!: Identity;
  amount!: bigint;
  riskLevel!: string; // PlinkoRiskLevel
  rows!: number; // u8: 8, 12, or 16
  path!: string; // JSON array of 'L'/'R'
  multiplier!: number; // f64
  payout!: bigint;
  seedData!: string;
  createdAt!: bigint;
}

/**
 * CaseBattles - Multiplayer case battle lobbies.
 */
@table({ name: 'case_battles', primaryKey: 'id' })
export class CaseBattles {
  id!: number; // @autoInc
  creatorIdentity!: Identity;
  mode!: string; // CaseBattleMode
  totalCost!: bigint;
  status!: string; // CaseBattleStatus
  winnerIdentity!: Identity; // Zero-identity if not resolved
  seedData!: string;
  createdAt!: bigint;
}

/**
 * CaseBattlePlayers - Players in a case battle and their results.
 */
@table({ name: 'case_battle_players', primaryKey: 'id' })
export class CaseBattlePlayers {
  id!: number; // @autoInc
  battleId!: number;
  identity!: Identity;
  slot!: number; // u8 - player slot index
  totalValue!: bigint;
  isReady!: boolean;
}

/**
 * CaseBattleRounds - Individual case openings within a battle.
 */
@table({ name: 'case_battle_rounds', primaryKey: 'id' })
export class CaseBattleRounds {
  id!: number; // @autoInc
  battleId!: number;
  roundNumber!: number; // u8
  caseId!: number;
  results!: string; // JSON: { [slot]: { itemId, creditValue } }
  status!: string; // CaseBattleRoundStatus
}

/**
 * ChatMessages - In-app chat messages.
 */
@table({ name: 'chat_messages', primaryKey: 'id' })
export class ChatMessages {
  id!: number; // @autoInc
  identity!: Identity;
  channel!: string;
  message!: string;
  createdAt!: bigint;
}

// ─── Helper: Typed zero-identity constant ───────────────────────────────────

/**
 * A sentinel Identity value used for "not set" optional Identity fields.
 * SpacetimeDB Identity is a 256-bit value; all zeros means "none".
 */
export const ZERO_IDENTITY = new Uint8Array(32) as unknown as Identity;

// ─── Helper: Current timestamp as bigint epoch ms ───────────────────────────

export function nowMs(): bigint {
  return BigInt(Date.now());
}
