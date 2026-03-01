import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  MOCK_USER_IDENTITY,
  MOCK_USERNAME,
  MOCK_BALANCE,
  CRASH,
  ROULETTE,
  CHAT,
} from "./constants";

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface User {
  identity: string;
  username: string;
  balance: number; // cents
  isAdmin: boolean;
  avatarUrl?: string;
  level: number;
}

// ── Crash ──

export type CrashPhase = "waiting" | "running" | "crashed";

export interface CrashBet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  autoCashout: number | null;
  cashedOutAt: number | null; // multiplier or null if busted
  profit: number;
}

export interface CrashRound {
  id: string;
  phase: CrashPhase;
  crashPoint: number | null;
  currentMultiplier: number;
  startedAt: number;
  bets: CrashBet[];
  countdown: number; // seconds remaining in waiting phase
}

export interface CrashHistoryEntry {
  roundId: string;
  crashPoint: number;
}

// ── Roulette ──

export type RoulettePhase = "betting" | "spinning" | "result";
export type RouletteColor = "red" | "green" | "black";

export interface RouletteBet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  color: RouletteColor;
}

export interface RouletteRound {
  id: string;
  phase: RoulettePhase;
  result: number | null; // 0-14
  resultColor: RouletteColor | null;
  bets: RouletteBet[];
  countdown: number;
}

export interface RouletteHistoryEntry {
  roundId: string;
  result: number;
  color: RouletteColor;
}

// ── Coin Flip ──

export type CoinSide = "CT" | "T";
export type CoinFlipStatus = "waiting" | "flipping" | "complete";

export interface CoinFlipGame {
  id: string;
  creatorId: string;
  creatorName: string;
  joinerId: string | null;
  joinerName: string | null;
  amount: number;
  creatorSide: CoinSide;
  result: CoinSide | null;
  status: CoinFlipStatus;
  winnerId: string | null;
}

// ── Cases ──

export interface CaseItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  rarityColor: string;
  value: number; // cents
  weight: number;
}

export interface GameCase {
  id: string;
  name: string;
  imageUrl: string;
  price: number; // cents
  items: CaseItem[];
}

export interface CaseOpeningResult {
  caseId: string;
  item: CaseItem;
  spinning: boolean;
}

// ── Plinko ──

export interface PlinkoBall {
  id: string;
  path: number[];
  bucket: number;
  multiplier: number;
  bet: number;
  animating: boolean;
}

// ── Case Battles ──

export type BattleStatus = "waiting" | "in_progress" | "complete";

export interface BattlePlayer {
  userId: string;
  username: string;
  totalValue: number;
  results: CaseItem[];
}

export interface CaseBattle {
  id: string;
  status: BattleStatus;
  cases: GameCase[];
  players: BattlePlayer[];
  maxPlayers: number;
  currentRound: number;
  totalRounds: number;
  winnerId: string | null;
  costPerPlayer: number;
}

// ── Chat ──

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  isAdmin: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// State
// ══════════════════════════════════════════════════════════════════════════════

export interface GameState {
  user: User | null;
  connected: boolean;

  crash: {
    currentRound: CrashRound;
    history: CrashHistoryEntry[];
  };

  roulette: {
    currentRound: RouletteRound;
    history: RouletteHistoryEntry[];
  };

  coinflip: {
    games: CoinFlipGame[];
  };

  cases: {
    catalog: GameCase[];
    currentOpening: CaseOpeningResult | null;
  };

  plinko: {
    balls: PlinkoBall[];
    history: { multiplier: number; profit: number }[];
  };

  caseBattles: {
    battles: CaseBattle[];
    activeBattle: CaseBattle | null;
  };

  chat: {
    messages: ChatMessage[];
  };
}

// ── Mock initial data ──

function makeMockCrashHistory(): CrashHistoryEntry[] {
  const pts = [2.41, 1.13, 5.78, 1.0, 3.22, 1.87, 12.45, 1.5, 2.01, 1.03,
    7.89, 1.44, 2.66, 1.0, 4.12, 1.22, 3.5, 15.6, 1.78, 2.0];
  return pts.map((p, i) => ({ roundId: `cr-${i}`, crashPoint: p }));
}

function makeMockRouletteHistory(): RouletteHistoryEntry[] {
  const colors: RouletteColor[] = ["red", "black", "green", "red", "black", "red",
    "black", "red", "black", "black", "red", "green", "black", "red", "red"];
  return colors.map((c, i) => ({
    roundId: `rl-${i}`,
    result: c === "green" ? 0 : c === "red" ? (i % 7) + 1 : (i % 7) + 8,
    color: c,
  }));
}

function makeMockCases(): GameCase[] {
  return [
    {
      id: "case-1",
      name: "Danger Zone",
      imageUrl: "/cases/danger-zone.png",
      price: 500_00,
      items: [
        { id: "i1", name: "AK-47 | Redline", imageUrl: "/items/ak-redline.png", rarity: "CLASSIFIED", rarityColor: "#d32ce6", value: 1200_00, weight: 50 },
        { id: "i2", name: "M4A4 | Howl", imageUrl: "/items/m4-howl.png", rarity: "COVERT", rarityColor: "#eb4b4b", value: 8500_00, weight: 5 },
        { id: "i3", name: "USP-S | Kill Confirmed", imageUrl: "/items/usp-kill.png", rarity: "COVERT", rarityColor: "#eb4b4b", value: 3200_00, weight: 15 },
        { id: "i4", name: "AWP | Asiimov", imageUrl: "/items/awp-asi.png", rarity: "COVERT", rarityColor: "#eb4b4b", value: 4500_00, weight: 10 },
        { id: "i5", name: "Glock-18 | Fade", imageUrl: "/items/glock-fade.png", rarity: "RESTRICTED", rarityColor: "#8847ff", value: 600_00, weight: 100 },
        { id: "i6", name: "P250 | See Ya Later", imageUrl: "/items/p250-syl.png", rarity: "MIL_SPEC", rarityColor: "#4b69ff", value: 200_00, weight: 300 },
        { id: "i7", name: "SCAR-20 | Bloodsport", imageUrl: "/items/scar-blood.png", rarity: "MIL_SPEC", rarityColor: "#4b69ff", value: 150_00, weight: 350 },
        { id: "i8", name: "Karambit | Doppler", imageUrl: "/items/kara-doppler.png", rarity: "RARE_SPECIAL", rarityColor: "#ffd700", value: 25000_00, weight: 2 },
      ],
    },
    {
      id: "case-2",
      name: "Spectrum",
      imageUrl: "/cases/spectrum.png",
      price: 250_00,
      items: [
        { id: "i9", name: "AK-47 | Bloodsport", imageUrl: "/items/ak-blood.png", rarity: "COVERT", rarityColor: "#eb4b4b", value: 2000_00, weight: 20 },
        { id: "i10", name: "M4A1-S | Decimator", imageUrl: "/items/m4-deci.png", rarity: "CLASSIFIED", rarityColor: "#d32ce6", value: 800_00, weight: 60 },
        { id: "i11", name: "CZ75 | Xiangliu", imageUrl: "/items/cz-xiang.png", rarity: "RESTRICTED", rarityColor: "#8847ff", value: 350_00, weight: 120 },
        { id: "i12", name: "Five-SeveN | Hyper Beast", imageUrl: "/items/57-hyper.png", rarity: "MIL_SPEC", rarityColor: "#4b69ff", value: 100_00, weight: 400 },
        { id: "i13", name: "Sawed-Off | Zander", imageUrl: "/items/so-zander.png", rarity: "CONSUMER", rarityColor: "#b0c3d9", value: 30_00, weight: 500 },
        { id: "i14", name: "Butterfly | Fade", imageUrl: "/items/bfly-fade.png", rarity: "RARE_SPECIAL", rarityColor: "#ffd700", value: 18000_00, weight: 3 },
      ],
    },
    {
      id: "case-3",
      name: "Bravo",
      imageUrl: "/cases/bravo.png",
      price: 100_00,
      items: [
        { id: "i15", name: "P90 | Asiimov", imageUrl: "/items/p90-asi.png", rarity: "CLASSIFIED", rarityColor: "#d32ce6", value: 500_00, weight: 80 },
        { id: "i16", name: "Deagle | Blaze", imageUrl: "/items/deag-blaze.png", rarity: "RESTRICTED", rarityColor: "#8847ff", value: 300_00, weight: 150 },
        { id: "i17", name: "Nova | Antique", imageUrl: "/items/nova-anti.png", rarity: "MIL_SPEC", rarityColor: "#4b69ff", value: 50_00, weight: 500 },
        { id: "i18", name: "UMP-45 | Blaze", imageUrl: "/items/ump-blaze.png", rarity: "INDUSTRIAL", rarityColor: "#5e98d9", value: 20_00, weight: 600 },
      ],
    },
    {
      id: "case-4",
      name: "Gamma",
      imageUrl: "/cases/gamma.png",
      price: 350_00,
      items: [
        { id: "i19", name: "FAMAS | Mecha Industries", imageUrl: "/items/famas-mecha.png", rarity: "CLASSIFIED", rarityColor: "#d32ce6", value: 700_00, weight: 70 },
        { id: "i20", name: "AWP | Phobos", imageUrl: "/items/awp-phobos.png", rarity: "MIL_SPEC", rarityColor: "#4b69ff", value: 80_00, weight: 400 },
        { id: "i21", name: "R8 | Reboot", imageUrl: "/items/r8-reboot.png", rarity: "RESTRICTED", rarityColor: "#8847ff", value: 400_00, weight: 130 },
        { id: "i22", name: "Bayonet | Gamma Doppler", imageUrl: "/items/bayo-gamma.png", rarity: "RARE_SPECIAL", rarityColor: "#ffd700", value: 12000_00, weight: 3 },
      ],
    },
  ];
}

function makeMockCoinFlipGames(): CoinFlipGame[] {
  return [
    { id: "cf-1", creatorId: "u2", creatorName: "Ace", joinerId: null, joinerName: null, amount: 500_00, creatorSide: "CT", result: null, status: "waiting", winnerId: null },
    { id: "cf-2", creatorId: "u3", creatorName: "Blaze", joinerId: null, joinerName: null, amount: 1000_00, creatorSide: "T", result: null, status: "waiting", winnerId: null },
    { id: "cf-3", creatorId: "u4", creatorName: "Cipher", joinerId: "u5", joinerName: "Dex", amount: 250_00, creatorSide: "CT", result: "CT", status: "complete", winnerId: "u4" },
  ];
}

function makeMockBattles(): CaseBattle[] {
  return [
    {
      id: "bt-1",
      status: "waiting",
      cases: makeMockCases().slice(0, 2),
      players: [
        { userId: "u6", username: "StormX", totalValue: 0, results: [] },
      ],
      maxPlayers: 2,
      currentRound: 0,
      totalRounds: 2,
      winnerId: null,
      costPerPlayer: 750_00,
    },
  ];
}

function makeMockChat(): ChatMessage[] {
  return [
    { id: "ch-1", userId: "u2", username: "Ace", message: "gg that was insane", timestamp: Date.now() - 30000, isAdmin: false },
    { id: "ch-2", userId: "u3", username: "Blaze", message: "crashed at 1.0x lol", timestamp: Date.now() - 20000, isAdmin: false },
    { id: "ch-3", userId: "system", username: "System", message: "Welcome to CS2 Arena!", timestamp: Date.now() - 10000, isAdmin: true },
  ];
}

const initialCrashRound: CrashRound = {
  id: "cr-current",
  phase: "waiting",
  crashPoint: null,
  currentMultiplier: 1.0,
  startedAt: Date.now(),
  bets: [],
  countdown: CRASH.COUNTDOWN_SECONDS,
};

const initialRouletteRound: RouletteRound = {
  id: "rl-current",
  phase: "betting",
  result: null,
  resultColor: null,
  bets: [],
  countdown: ROULETTE.COUNTDOWN_SECONDS,
};

const initialState: GameState = {
  user: {
    identity: MOCK_USER_IDENTITY,
    username: MOCK_USERNAME,
    balance: MOCK_BALANCE,
    isAdmin: true,
    level: 42,
  },
  connected: true,
  crash: {
    currentRound: initialCrashRound,
    history: makeMockCrashHistory(),
  },
  roulette: {
    currentRound: initialRouletteRound,
    history: makeMockRouletteHistory(),
  },
  coinflip: {
    games: makeMockCoinFlipGames(),
  },
  cases: {
    catalog: makeMockCases(),
    currentOpening: null,
  },
  plinko: {
    balls: [],
    history: [],
  },
  caseBattles: {
    battles: makeMockBattles(),
    activeBattle: null,
  },
  chat: {
    messages: makeMockChat(),
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// Actions
// ══════════════════════════════════════════════════════════════════════════════

export type GameAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_BALANCE"; payload: number }
  | { type: "SET_CONNECTED"; payload: boolean }
  // Crash
  | { type: "CRASH_SET_PHASE"; payload: CrashPhase }
  | { type: "CRASH_SET_MULTIPLIER"; payload: number }
  | { type: "CRASH_SET_COUNTDOWN"; payload: number }
  | { type: "CRASH_SET_CRASH_POINT"; payload: number }
  | { type: "CRASH_PLACE_BET"; payload: CrashBet }
  | { type: "CRASH_CASHOUT"; payload: { betId: string; multiplier: number } }
  | { type: "CRASH_NEW_ROUND"; payload: CrashRound }
  | { type: "CRASH_ADD_HISTORY"; payload: CrashHistoryEntry }
  // Roulette
  | { type: "ROULETTE_SET_PHASE"; payload: RoulettePhase }
  | { type: "ROULETTE_SET_COUNTDOWN"; payload: number }
  | { type: "ROULETTE_PLACE_BET"; payload: RouletteBet }
  | { type: "ROULETTE_SET_RESULT"; payload: { result: number; color: RouletteColor } }
  | { type: "ROULETTE_NEW_ROUND"; payload: RouletteRound }
  | { type: "ROULETTE_ADD_HISTORY"; payload: RouletteHistoryEntry }
  // Coin Flip
  | { type: "COINFLIP_ADD_GAME"; payload: CoinFlipGame }
  | { type: "COINFLIP_JOIN_GAME"; payload: { gameId: string; joinerId: string; joinerName: string } }
  | { type: "COINFLIP_SET_RESULT"; payload: { gameId: string; result: CoinSide; winnerId: string } }
  | { type: "COINFLIP_REMOVE_GAME"; payload: string }
  // Cases
  | { type: "CASES_SET_OPENING"; payload: CaseOpeningResult | null }
  // Plinko
  | { type: "PLINKO_ADD_BALL"; payload: PlinkoBall }
  | { type: "PLINKO_UPDATE_BALL"; payload: { id: string; animating: boolean } }
  | { type: "PLINKO_ADD_HISTORY"; payload: { multiplier: number; profit: number } }
  // Case Battles
  | { type: "BATTLES_SET_ACTIVE"; payload: CaseBattle | null }
  | { type: "BATTLES_UPDATE"; payload: CaseBattle }
  | { type: "BATTLES_ADD"; payload: CaseBattle }
  // Chat
  | { type: "CHAT_ADD_MESSAGE"; payload: ChatMessage }
  | { type: "CHAT_SET_MESSAGES"; payload: ChatMessage[] };

// ══════════════════════════════════════════════════════════════════════════════
// Reducer
// ══════════════════════════════════════════════════════════════════════════════

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // ── Global ──
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_BALANCE":
      return state.user
        ? { ...state, user: { ...state.user, balance: action.payload } }
        : state;
    case "SET_CONNECTED":
      return { ...state, connected: action.payload };

    // ── Crash ──
    case "CRASH_SET_PHASE":
      return {
        ...state,
        crash: {
          ...state.crash,
          currentRound: { ...state.crash.currentRound, phase: action.payload },
        },
      };
    case "CRASH_SET_MULTIPLIER":
      return {
        ...state,
        crash: {
          ...state.crash,
          currentRound: { ...state.crash.currentRound, currentMultiplier: action.payload },
        },
      };
    case "CRASH_SET_COUNTDOWN":
      return {
        ...state,
        crash: {
          ...state.crash,
          currentRound: { ...state.crash.currentRound, countdown: action.payload },
        },
      };
    case "CRASH_SET_CRASH_POINT":
      return {
        ...state,
        crash: {
          ...state.crash,
          currentRound: { ...state.crash.currentRound, crashPoint: action.payload },
        },
      };
    case "CRASH_PLACE_BET":
      return {
        ...state,
        crash: {
          ...state.crash,
          currentRound: {
            ...state.crash.currentRound,
            bets: [...state.crash.currentRound.bets, action.payload],
          },
        },
      };
    case "CRASH_CASHOUT": {
      const bets = state.crash.currentRound.bets.map((b) =>
        b.id === action.payload.betId
          ? {
              ...b,
              cashedOutAt: action.payload.multiplier,
              profit: Math.floor(b.amount * action.payload.multiplier) - b.amount,
            }
          : b,
      );
      return {
        ...state,
        crash: {
          ...state.crash,
          currentRound: { ...state.crash.currentRound, bets },
        },
      };
    }
    case "CRASH_NEW_ROUND":
      return {
        ...state,
        crash: { ...state.crash, currentRound: action.payload },
      };
    case "CRASH_ADD_HISTORY":
      return {
        ...state,
        crash: {
          ...state.crash,
          history: [action.payload, ...state.crash.history].slice(0, 20),
        },
      };

    // ── Roulette ──
    case "ROULETTE_SET_PHASE":
      return {
        ...state,
        roulette: {
          ...state.roulette,
          currentRound: { ...state.roulette.currentRound, phase: action.payload },
        },
      };
    case "ROULETTE_SET_COUNTDOWN":
      return {
        ...state,
        roulette: {
          ...state.roulette,
          currentRound: { ...state.roulette.currentRound, countdown: action.payload },
        },
      };
    case "ROULETTE_PLACE_BET":
      return {
        ...state,
        roulette: {
          ...state.roulette,
          currentRound: {
            ...state.roulette.currentRound,
            bets: [...state.roulette.currentRound.bets, action.payload],
          },
        },
      };
    case "ROULETTE_SET_RESULT":
      return {
        ...state,
        roulette: {
          ...state.roulette,
          currentRound: {
            ...state.roulette.currentRound,
            result: action.payload.result,
            resultColor: action.payload.color,
          },
        },
      };
    case "ROULETTE_NEW_ROUND":
      return {
        ...state,
        roulette: { ...state.roulette, currentRound: action.payload },
      };
    case "ROULETTE_ADD_HISTORY":
      return {
        ...state,
        roulette: {
          ...state.roulette,
          history: [action.payload, ...state.roulette.history].slice(0, 100),
        },
      };

    // ── Coin Flip ──
    case "COINFLIP_ADD_GAME":
      return {
        ...state,
        coinflip: { games: [...state.coinflip.games, action.payload] },
      };
    case "COINFLIP_JOIN_GAME":
      return {
        ...state,
        coinflip: {
          games: state.coinflip.games.map((g) =>
            g.id === action.payload.gameId
              ? { ...g, joinerId: action.payload.joinerId, joinerName: action.payload.joinerName, status: "flipping" as CoinFlipStatus }
              : g,
          ),
        },
      };
    case "COINFLIP_SET_RESULT":
      return {
        ...state,
        coinflip: {
          games: state.coinflip.games.map((g) =>
            g.id === action.payload.gameId
              ? { ...g, result: action.payload.result, winnerId: action.payload.winnerId, status: "complete" as CoinFlipStatus }
              : g,
          ),
        },
      };
    case "COINFLIP_REMOVE_GAME":
      return {
        ...state,
        coinflip: {
          games: state.coinflip.games.filter((g) => g.id !== action.payload),
        },
      };

    // ── Cases ──
    case "CASES_SET_OPENING":
      return {
        ...state,
        cases: { ...state.cases, currentOpening: action.payload },
      };

    // ── Plinko ──
    case "PLINKO_ADD_BALL":
      return {
        ...state,
        plinko: { ...state.plinko, balls: [...state.plinko.balls, action.payload] },
      };
    case "PLINKO_UPDATE_BALL":
      return {
        ...state,
        plinko: {
          ...state.plinko,
          balls: state.plinko.balls.map((b) =>
            b.id === action.payload.id ? { ...b, animating: action.payload.animating } : b,
          ),
        },
      };
    case "PLINKO_ADD_HISTORY":
      return {
        ...state,
        plinko: {
          ...state.plinko,
          history: [action.payload, ...state.plinko.history].slice(0, 50),
        },
      };

    // ── Case Battles ──
    case "BATTLES_SET_ACTIVE":
      return {
        ...state,
        caseBattles: { ...state.caseBattles, activeBattle: action.payload },
      };
    case "BATTLES_UPDATE":
      return {
        ...state,
        caseBattles: {
          ...state.caseBattles,
          battles: state.caseBattles.battles.map((b) =>
            b.id === action.payload.id ? action.payload : b,
          ),
          activeBattle:
            state.caseBattles.activeBattle?.id === action.payload.id
              ? action.payload
              : state.caseBattles.activeBattle,
        },
      };
    case "BATTLES_ADD":
      return {
        ...state,
        caseBattles: {
          ...state.caseBattles,
          battles: [...state.caseBattles.battles, action.payload],
        },
      };

    // ── Chat ──
    case "CHAT_ADD_MESSAGE":
      return {
        ...state,
        chat: {
          messages: [...state.chat.messages, action.payload].slice(-CHAT.MAX_VISIBLE_MESSAGES),
        },
      };
    case "CHAT_SET_MESSAGES":
      return {
        ...state,
        chat: { messages: action.payload },
      };

    default:
      return state;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Context
// ══════════════════════════════════════════════════════════════════════════════

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  // Convenience action creators
  actions: {
    placeCrashBet: (amount: number, autoCashout: number | null) => void;
    cashoutCrash: () => void;
    placeRouletteBet: (amount: number, color: RouletteColor) => void;
    createCoinFlip: (amount: number, side: CoinSide) => void;
    joinCoinFlip: (gameId: string) => void;
    openCase: (caseId: string) => void;
    dropPlinkoBall: (bet: number, rows: number, risk: string) => void;
    sendChat: (message: string) => void;
    setBalance: (amount: number) => void;
  };
}

const GameContext = createContext<GameContextValue | null>(null);

// ══════════════════════════════════════════════════════════════════════════════
// Provider
// ══════════════════════════════════════════════════════════════════════════════

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Crash game loop ──
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const round = state.crash.currentRound;

    if (round.phase === "waiting" && round.countdown > 0) {
      timer = setInterval(() => {
        const cur = stateRef.current.crash.currentRound;
        if (cur.countdown <= 1) {
          dispatch({ type: "CRASH_SET_PHASE", payload: "running" });
          dispatch({ type: "CRASH_SET_COUNTDOWN", payload: 0 });
          // Generate random crash point for demo
          const cp = Math.max(1, Math.floor((1 / (1 - Math.random())) * 100) / 100);
          dispatch({ type: "CRASH_SET_CRASH_POINT", payload: cp });
        } else {
          dispatch({ type: "CRASH_SET_COUNTDOWN", payload: cur.countdown - 1 });
        }
      }, 1000);
    }

    if (round.phase === "running") {
      const startTime = Date.now();
      const crashPoint = round.crashPoint ?? 2.0;
      timer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const mult = Math.pow(Math.E, 0.07 * elapsed);
        const rounded = Math.floor(mult * 100) / 100;

        if (rounded >= crashPoint) {
          dispatch({ type: "CRASH_SET_MULTIPLIER", payload: crashPoint });
          dispatch({ type: "CRASH_SET_PHASE", payload: "crashed" });
          dispatch({
            type: "CRASH_ADD_HISTORY",
            payload: { roundId: stateRef.current.crash.currentRound.id, crashPoint },
          });
          // Auto-cashout handling
          stateRef.current.crash.currentRound.bets.forEach((bet) => {
            if (bet.autoCashout && !bet.cashedOutAt && bet.autoCashout <= crashPoint) {
              dispatch({
                type: "CRASH_CASHOUT",
                payload: { betId: bet.id, multiplier: bet.autoCashout },
              });
            }
          });
          // Start new round after delay
          setTimeout(() => {
            dispatch({
              type: "CRASH_NEW_ROUND",
              payload: {
                id: `cr-${Date.now()}`,
                phase: "waiting",
                crashPoint: null,
                currentMultiplier: 1.0,
                startedAt: Date.now(),
                bets: [],
                countdown: CRASH.COUNTDOWN_SECONDS,
              },
            });
          }, 3000);
        } else {
          dispatch({ type: "CRASH_SET_MULTIPLIER", payload: rounded });
          // Auto-cashout check
          stateRef.current.crash.currentRound.bets.forEach((bet) => {
            if (bet.autoCashout && !bet.cashedOutAt && rounded >= bet.autoCashout) {
              dispatch({
                type: "CRASH_CASHOUT",
                payload: { betId: bet.id, multiplier: bet.autoCashout },
              });
            }
          });
        }
      }, CRASH.TICK_RATE_MS);
    }

    return () => clearInterval(timer);
  }, [state.crash.currentRound.phase, state.crash.currentRound.countdown]);

  // ── Roulette game loop ──
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const round = state.roulette.currentRound;

    if (round.phase === "betting" && round.countdown > 0) {
      timer = setInterval(() => {
        const cur = stateRef.current.roulette.currentRound;
        if (cur.countdown <= 1) {
          dispatch({ type: "ROULETTE_SET_PHASE", payload: "spinning" });
          dispatch({ type: "ROULETTE_SET_COUNTDOWN", payload: 0 });
          const result = Math.floor(Math.random() * 15);
          const color: RouletteColor = result === 0 ? "green" : result <= 7 ? "red" : "black";
          dispatch({ type: "ROULETTE_SET_RESULT", payload: { result, color } });

          // After spin duration, show result
          setTimeout(() => {
            dispatch({ type: "ROULETTE_SET_PHASE", payload: "result" });
            dispatch({
              type: "ROULETTE_ADD_HISTORY",
              payload: {
                roundId: stateRef.current.roulette.currentRound.id,
                result,
                color,
              },
            });

            // New round after delay
            setTimeout(() => {
              dispatch({
                type: "ROULETTE_NEW_ROUND",
                payload: {
                  id: `rl-${Date.now()}`,
                  phase: "betting",
                  result: null,
                  resultColor: null,
                  bets: [],
                  countdown: ROULETTE.COUNTDOWN_SECONDS,
                },
              });
            }, 3000);
          }, ROULETTE.SPIN_DURATION_MS);
        } else {
          dispatch({ type: "ROULETTE_SET_COUNTDOWN", payload: cur.countdown - 1 });
        }
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [state.roulette.currentRound.phase, state.roulette.currentRound.countdown]);

  // ── Action creators ──

  const placeCrashBet = useCallback(
    (amount: number, autoCashout: number | null) => {
      const s = stateRef.current;
      if (!s.user || s.crash.currentRound.phase !== "waiting") return;
      if (amount > s.user.balance) return;

      const bet: CrashBet = {
        id: `cb-${Date.now()}`,
        userId: s.user.identity,
        username: s.user.username,
        amount,
        autoCashout,
        cashedOutAt: null,
        profit: 0,
      };

      dispatch({ type: "CRASH_PLACE_BET", payload: bet });
      dispatch({ type: "SET_BALANCE", payload: s.user.balance - amount });
    },
    [],
  );

  const cashoutCrash = useCallback(() => {
    const s = stateRef.current;
    if (!s.user || s.crash.currentRound.phase !== "running") return;

    const myBet = s.crash.currentRound.bets.find(
      (b) => b.userId === s.user!.identity && !b.cashedOutAt,
    );
    if (!myBet) return;

    const mult = s.crash.currentRound.currentMultiplier;
    const profit = Math.floor(myBet.amount * mult) - myBet.amount;
    dispatch({ type: "CRASH_CASHOUT", payload: { betId: myBet.id, multiplier: mult } });
    dispatch({ type: "SET_BALANCE", payload: s.user.balance + myBet.amount + profit });
  }, []);

  const placeRouletteBet = useCallback(
    (amount: number, color: RouletteColor) => {
      const s = stateRef.current;
      if (!s.user || s.roulette.currentRound.phase !== "betting") return;
      if (amount > s.user.balance) return;

      const bet: RouletteBet = {
        id: `rb-${Date.now()}`,
        userId: s.user.identity,
        username: s.user.username,
        amount,
        color,
      };

      dispatch({ type: "ROULETTE_PLACE_BET", payload: bet });
      dispatch({ type: "SET_BALANCE", payload: s.user.balance - amount });
    },
    [],
  );

  const createCoinFlip = useCallback(
    (amount: number, side: CoinSide) => {
      const s = stateRef.current;
      if (!s.user || amount > s.user.balance) return;

      const game: CoinFlipGame = {
        id: `cf-${Date.now()}`,
        creatorId: s.user.identity,
        creatorName: s.user.username,
        joinerId: null,
        joinerName: null,
        amount,
        creatorSide: side,
        result: null,
        status: "waiting",
        winnerId: null,
      };

      dispatch({ type: "COINFLIP_ADD_GAME", payload: game });
      dispatch({ type: "SET_BALANCE", payload: s.user.balance - amount });
    },
    [],
  );

  const joinCoinFlip = useCallback(
    (gameId: string) => {
      const s = stateRef.current;
      if (!s.user) return;

      const game = s.coinflip.games.find((g) => g.id === gameId);
      if (!game || game.status !== "waiting") return;
      if (game.amount > s.user.balance) return;

      dispatch({
        type: "COINFLIP_JOIN_GAME",
        payload: { gameId, joinerId: s.user.identity, joinerName: s.user.username },
      });
      dispatch({ type: "SET_BALANCE", payload: s.user.balance - game.amount });

      // Simulate flip result after animation
      setTimeout(() => {
        const result: CoinSide = Math.random() < 0.5 ? "CT" : "T";
        const winnerId = result === game.creatorSide ? game.creatorId : s.user!.identity;
        dispatch({ type: "COINFLIP_SET_RESULT", payload: { gameId, result, winnerId } });
        if (winnerId === s.user!.identity) {
          dispatch({ type: "SET_BALANCE", payload: stateRef.current.user!.balance + game.amount * 2 });
        }
      }, 2500);
    },
    [],
  );

  const openCase = useCallback(
    (caseId: string) => {
      const s = stateRef.current;
      if (!s.user) return;

      const cs = s.cases.catalog.find((c) => c.id === caseId);
      if (!cs || cs.price > s.user.balance) return;

      dispatch({ type: "SET_BALANCE", payload: s.user.balance - cs.price });

      // Pick random item based on weights
      const totalWeight = cs.items.reduce((sum, item) => sum + item.weight, 0);
      let roll = Math.floor(Math.random() * totalWeight);
      let wonItem = cs.items[0];
      for (const item of cs.items) {
        roll -= item.weight;
        if (roll < 0) {
          wonItem = item;
          break;
        }
      }

      dispatch({
        type: "CASES_SET_OPENING",
        payload: { caseId, item: wonItem, spinning: true },
      });

      // Stop spinning after animation
      setTimeout(() => {
        dispatch({
          type: "CASES_SET_OPENING",
          payload: { caseId, item: wonItem, spinning: false },
        });
        dispatch({ type: "SET_BALANCE", payload: stateRef.current.user!.balance + wonItem.value });
      }, 4500);
    },
    [],
  );

  const dropPlinkoBall = useCallback(
    (bet: number, rows: number, risk: string) => {
      const s = stateRef.current;
      if (!s.user || bet > s.user.balance) return;

      dispatch({ type: "SET_BALANCE", payload: s.user.balance - bet });

      // Generate random path
      const path: number[] = [];
      let bucket = 0;
      for (let i = 0; i < rows; i++) {
        const dir = Math.random() < 0.5 ? 0 : 1;
        path.push(dir);
        bucket += dir;
      }

      const { PLINKO_MULTIPLIERS } = require("./constants");
      const mults = PLINKO_MULTIPLIERS[rows as 8 | 12 | 16]?.[risk as "low" | "medium" | "high"];
      const multiplier = mults?.[bucket] ?? 1;

      const ball: PlinkoBall = {
        id: `pk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        path,
        bucket,
        multiplier,
        bet,
        animating: true,
      };

      dispatch({ type: "PLINKO_ADD_BALL", payload: ball });

      // Complete animation
      setTimeout(() => {
        dispatch({ type: "PLINKO_UPDATE_BALL", payload: { id: ball.id, animating: false } });
        const profit = Math.floor(bet * multiplier) - bet;
        dispatch({ type: "PLINKO_ADD_HISTORY", payload: { multiplier, profit } });
        dispatch({ type: "SET_BALANCE", payload: stateRef.current.user!.balance + Math.floor(bet * multiplier) });
      }, 2000 + rows * 100);
    },
    [],
  );

  const sendChat = useCallback(
    (message: string) => {
      const s = stateRef.current;
      if (!s.user || !message.trim()) return;

      const msg: ChatMessage = {
        id: `ch-${Date.now()}`,
        userId: s.user.identity,
        username: s.user.username,
        message: message.trim().slice(0, CHAT.MAX_MESSAGE_LENGTH),
        timestamp: Date.now(),
        isAdmin: s.user.isAdmin,
      };

      dispatch({ type: "CHAT_ADD_MESSAGE", payload: msg });
    },
    [],
  );

  const setBalance = useCallback((amount: number) => {
    dispatch({ type: "SET_BALANCE", payload: amount });
  }, []);

  const actions = {
    placeCrashBet,
    cashoutCrash,
    placeRouletteBet,
    createCoinFlip,
    joinCoinFlip,
    openCase,
    dropPlinkoBall,
    sendChat,
    setBalance,
  };

  return (
    <GameContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </GameContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Hook
// ══════════════════════════════════════════════════════════════════════════════

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return ctx;
}
