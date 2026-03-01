// ── Color tokens (also in Tailwind theme, but useful for canvas/JS) ──
export const COLORS = {
  bg: "#0a0e17",
  surface: "#131926",
  surfaceHover: "#1a2236",
  border: "#1e2a3a",
  primary: "#00d4ff",
  primaryDim: "#00a0c0",
  success: "#00ff88",
  danger: "#ff4757",
  gold: "#ffd700",
  text: "#e2e8f0",
  textSecondary: "#64748b",
} as const;

// ── Game IDs ──
export const GAME_IDS = {
  CRASH: "crash",
  ROULETTE: "roulette",
  COINFLIP: "coinflip",
  CASES: "cases",
  PLINKO: "plinko",
  CASE_BATTLES: "case-battles",
} as const;

// ── Crash ──
export const CRASH = {
  MIN_BET: 10, // 0.10 credits (in cents)
  MAX_BET: 10_000_00, // 10,000.00 credits
  MIN_AUTO_CASHOUT: 1.01,
  MAX_AUTO_CASHOUT: 1_000_000,
  TICK_RATE_MS: 50,
  COUNTDOWN_SECONDS: 8,
  HOUSE_EDGE: 0.04, // 4%
} as const;

// ── Roulette ──
export const ROULETTE = {
  MIN_BET: 10,
  MAX_BET: 10_000_00,
  SLOTS_COUNT: 15,
  RED_MULTIPLIER: 2,
  GREEN_MULTIPLIER: 14,
  BLACK_MULTIPLIER: 2,
  COUNTDOWN_SECONDS: 15,
  SPIN_DURATION_MS: 5000,
  SLOT_COLORS: [
    "red", "black", "red", "black", "red", "black", "red",
    "green",
    "black", "red", "black", "red", "black", "red", "black",
  ] as ("red" | "green" | "black")[],
} as const;

export const ROULETTE_COLOR_MAP: Record<string, string> = {
  red: COLORS.danger,
  green: COLORS.success,
  black: "#2d3748",
};

// ── Coin Flip ──
export const COINFLIP = {
  MIN_BET: 100, // 1.00 credits
  MAX_BET: 10_000_00,
  SIDES: ["CT", "T"] as const,
  ANIMATION_DURATION_MS: 2000,
} as const;

// ── Cases ──
export const CASE_RARITIES = {
  CONSUMER: { label: "Consumer Grade", color: "#b0c3d9" },
  INDUSTRIAL: { label: "Industrial Grade", color: "#5e98d9" },
  MIL_SPEC: { label: "Mil-Spec", color: "#4b69ff" },
  RESTRICTED: { label: "Restricted", color: "#8847ff" },
  CLASSIFIED: { label: "Classified", color: "#d32ce6" },
  COVERT: { label: "Covert", color: "#eb4b4b" },
  RARE_SPECIAL: { label: "Rare Special", color: COLORS.gold },
} as const;

export type CaseRarityKey = keyof typeof CASE_RARITIES;

// ── Plinko ──
export const PLINKO = {
  MIN_BET: 10,
  MAX_BET: 10_000_00,
  ROWS_OPTIONS: [8, 12, 16] as const,
  RISK_OPTIONS: ["low", "medium", "high"] as const,
  BALL_RADIUS: 6,
  PEG_RADIUS: 4,
  ANIMATION_SPEED: 2,
} as const;

export type PlinkoRows = (typeof PLINKO.ROWS_OPTIONS)[number];
export type PlinkoRisk = (typeof PLINKO.RISK_OPTIONS)[number];

// Multiplier tables: [rows][risk] → multiplier array (left to right buckets)
export const PLINKO_MULTIPLIERS: Record<PlinkoRows, Record<PlinkoRisk, number[]>> = {
  8: {
    low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
    medium: [25, 6, 2, 1.4, 0.6, 0.4, 0.3, 0.4, 0.6, 1.4, 2, 6, 25],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
} as const;

// ── Case Battles ──
export const CASE_BATTLES = {
  MAX_PLAYERS: 4,
  MAX_ROUNDS: 10,
} as const;

// ── Chat ──
export const CHAT = {
  MAX_MESSAGE_LENGTH: 200,
  MAX_VISIBLE_MESSAGES: 50,
} as const;

// ── Routes ──
export const ROUTES = {
  HOME: "/",
  CRASH: "/crash",
  ROULETTE: "/roulette",
  COINFLIP: "/coinflip",
  CASES: "/cases",
  PLINKO: "/plinko",
  CASE_BATTLES: "/case-battles",
  PROVABLY_FAIR: "/provably-fair",
  ADMIN: "/admin",
} as const;

// ── Nav items ──
export const NAV_ITEMS = [
  { path: ROUTES.CRASH, label: "Crash", icon: "rocket" },
  { path: ROUTES.ROULETTE, label: "Roulette", icon: "circle" },
  { path: ROUTES.COINFLIP, label: "Coin Flip", icon: "coin" },
  { path: ROUTES.CASES, label: "Cases", icon: "box" },
  { path: ROUTES.PLINKO, label: "Plinko", icon: "triangle" },
  { path: ROUTES.CASE_BATTLES, label: "Case Battles", icon: "swords" },
] as const;

// ── Mock data identifiers ──
export const MOCK_USER_IDENTITY = "mock-user-001";
export const MOCK_USERNAME = "Player1";
export const MOCK_BALANCE = 100_000_00; // 100,000.00 credits
