/**
 * SpacetimeDB Server Module - CS2 Gambling Platform
 *
 * Main entry point. Exports all tables, reducers, and utilities
 * so that SpacetimeDB can discover and register them.
 *
 * Module Structure:
 * ├── tables.ts          - All table definitions and enums
 * ├── provablyFair.ts    - Cryptographic utilities for verifiable outcomes
 * └── reducers/
 *     ├── auth.ts        - User registration and profile management
 *     ├── credits.ts     - Balance management and admin operations
 *     ├── seeds.ts       - Provably fair seed management
 *     ├── crash.ts       - Crash game logic
 *     ├── roulette.ts    - Roulette game logic
 *     ├── coinflip.ts    - Peer-to-peer coin flip
 *     ├── cases.ts       - Case opening
 *     ├── plinko.ts      - Plinko ball drop
 *     ├── caseBattles.ts - Multiplayer case battles
 *     └── chat.ts        - In-app chat and moderation
 */

// ─── Table Definitions & Enums ──────────────────────────────────────────────
export {
  // Tables
  Users,
  Balances,
  Transactions,
  ServerSeeds,
  ClientSeeds,
  CrashRounds,
  CrashBets,
  RouletteRounds,
  RouletteBets,
  CoinFlips,
  Cases,
  CaseItems,
  CaseOpenings,
  PlinkoDrops,
  CaseBattles,
  CaseBattlePlayers,
  CaseBattleRounds,
  ChatMessages,
  // Enums
  UserRole,
  TransactionType,
  GameType,
  CrashRoundStatus,
  BetStatus,
  RouletteRoundStatus,
  RouletteColor,
  RouletteBetType,
  CoinFlipSide,
  CoinFlipStatus,
  ItemRarity,
  PlinkoRiskLevel,
  CaseBattleMode,
  CaseBattleStatus,
  CaseBattleRoundStatus,
  // Utilities
  ZERO_IDENTITY,
  nowMs,
} from './tables';

// ─── Provably Fair Utilities ────────────────────────────────────────────────
export {
  generateServerSeed,
  hashSeed,
  generateOutcome,
  crashPointFromHash,
  rouletteFromHash,
  rouletteColorFromResult,
  coinFlipFromHash,
  plinkoPathFromHash,
  plinkoBucketFromPath,
  caseRollFromHash,
  buildSeedData,
  parseSeedData,
} from './provablyFair';

// ─── Auth Reducers ──────────────────────────────────────────────────────────
export {
  registerUser,
  updateProfile,
} from './reducers/auth';

// ─── Credits Reducers ───────────────────────────────────────────────────────
export {
  adminGrantCredits,
  adminDeductCredits,
  // Internal helpers exported for use by other modules
  deductBalance,
  creditBalance,
  recordTransaction,
  trackWager,
  trackWinnings,
  requireAdmin,
  requireActiveUser,
} from './reducers/credits';

// ─── Seeds Reducers ─────────────────────────────────────────────────────────
export {
  setClientSeed,
  rotateSeed,
  getActiveSeed,
  requireActiveSeed,
  getClientSeed,
  consumeNonce,
} from './reducers/seeds';

// ─── Crash Game Reducers ────────────────────────────────────────────────────
export {
  startCrashRound,
  beginCrashRound,
  placeCrashBet,
  cashoutCrash,
  tickCrash,
  resolveCrash,
} from './reducers/crash';

// ─── Roulette Game Reducers ─────────────────────────────────────────────────
export {
  startRouletteRound,
  placeRouletteBet,
  closeAndResolveRoulette,
  resolveRoulette,
} from './reducers/roulette';

// ─── Coin Flip Reducers ────────────────────────────────────────────────────
export {
  createCoinFlip,
  joinCoinFlip,
  cancelCoinFlip,
} from './reducers/coinflip';

// ─── Cases Reducers ─────────────────────────────────────────────────────────
export {
  openCase,
  adminCreateCase,
  adminAddCaseItem,
  adminToggleCase,
} from './reducers/cases';

// ─── Plinko Reducers ───────────────────────────────────────────────────────
export {
  dropPlinko,
} from './reducers/plinko';

// ─── Case Battles Reducers ──────────────────────────────────────────────────
export {
  createCaseBattle,
  joinCaseBattle,
  startCaseBattle,
  leaveCaseBattle,
} from './reducers/caseBattles';

// ─── Chat Reducers ──────────────────────────────────────────────────────────
export {
  sendMessage,
  adminDeleteMessage,
  adminBanUser,
  adminUnbanUser,
} from './reducers/chat';
