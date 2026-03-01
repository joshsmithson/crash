# CS2 Gaming Platform

A real-time multiplayer CS2-themed gambling web app built with **SpacetimeDB** and **React**. All game outcomes are cryptographically verifiable via a provably fair system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | SpacetimeDB (TypeScript module) |
| Database | SpacetimeDB in-memory relational tables (auto-persisted) |
| Real-time sync | SpacetimeDB built-in subscriptions (WebSocket) |
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion + HTML Canvas |
| Routing | React Router v7 |

## Game Modes

| Game | Description | House Edge |
|------|-------------|-----------|
| **Crash** | Multiplier climbs on an exponential curve until it crashes. Cash out before it crashes to win. | 4% |
| **Roulette** | CS2-style wheel with Red (2x), Black (2x), and Green (14x) slots. | 6.67% |
| **Coin Flip** | PvP — one player creates a game, another joins. A coin is flipped. | 5% |
| **Case Opening** | Simulated CS2 case unboxing with weighted item drops and rarity tiers. | 10–15% |
| **Plinko** | Ball drops through a peg board into multiplier slots. Configurable rows and risk. | 3–5% |
| **Case Battles** | PvP case opening competition — highest total value wins the pot. | 5% |

## Project Structure

```
├── server/                      # SpacetimeDB TypeScript module
│   ├── src/
│   │   ├── tables.ts            # 18 database table definitions
│   │   ├── provablyFair.ts      # HMAC-SHA256 provably fair system
│   │   ├── index.ts             # Module entry point & lifecycle hooks
│   │   └── reducers/
│   │       ├── auth.ts          # User registration & authentication
│   │       ├── credits.ts       # Balance management & transactions
│   │       ├── seeds.ts         # Provably fair seed rotation
│   │       ├── crash.ts         # Crash game logic (100ms tick loop)
│   │       ├── roulette.ts      # Roulette round lifecycle
│   │       ├── coinflip.ts      # PvP coin flip with lobby
│   │       ├── cases.ts         # Case opening with weighted drops
│   │       ├── plinko.ts        # Plinko drop with path generation
│   │       ├── caseBattles.ts   # Multiplayer case battles
│   │       └── chat.ts          # Live chat with moderation
│   ├── package.json
│   └── tsconfig.json
│
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx             # App entry point
│   │   ├── App.tsx              # Routing & SpacetimeDB provider
│   │   ├── lib/
│   │   │   ├── constants.ts     # Colors, multiplier tables, config
│   │   │   ├── formatCredits.ts # Credit display formatting
│   │   │   ├── provablyFair.ts  # Client-side verification (Web Crypto)
│   │   │   └── gameContext.tsx   # Game state context & mock data
│   │   ├── hooks/
│   │   │   ├── useBetInput.ts   # Bet amount management
│   │   │   └── useGameSound.ts  # Sound effects via Howler.js
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Header, ChatPanel, Layout
│   │   │   ├── games/
│   │   │   │   ├── crash/       # CrashGame, CrashCanvas, BetPanel, BetList, History
│   │   │   │   ├── roulette/    # RouletteGame, Wheel, BetZones, History
│   │   │   │   ├── coinflip/    # Lobby, Game, CoinFlipAnimation
│   │   │   │   ├── cases/       # CaseCatalog, CaseOpening, CaseSpinner
│   │   │   │   ├── plinko/      # PlinkoGame, PlinkoBoard, Controls
│   │   │   │   └── case-battles/# BattleLobby, BattleGame, BattleResults
│   │   │   ├── shared/          # BetInput, BalanceDisplay, ProvablyFairModal
│   │   │   └── admin/           # AdminDashboard, CaseEditor, UserManager
│   │   ├── pages/
│   │   │   └── ProvablyFairPage.tsx
│   │   └── styles/
│   │       └── globals.css      # Tailwind v4 theme tokens
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── package.json                 # Workspace root (npm workspaces)
└── .gitignore
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [SpacetimeDB CLI](https://spacetimedb.com/install)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp client/.env.example client/.env

# Start SpacetimeDB local dev server
npm run dev:server

# In another terminal, generate type bindings and start the client
cd client && npm run generate
npm run dev:client
```

### Deploy

```bash
# Publish server module to SpacetimeDB Maincloud
spacetime login
npm run publish

# Build and deploy frontend (static files — host on Cloudflare Pages, Vercel, etc.)
npm run build:client
```

## Provably Fair System

Every game outcome is cryptographically verifiable using HMAC-SHA256:

```
outcome = HMAC-SHA256(serverSeed, clientSeed + ":" + nonce)
```

1. Server commits to a seed by showing its SHA-256 hash **before** any bets
2. User provides their own client seed
3. Each bet increments the nonce
4. The outcome is derived deterministically from both seeds + nonce
5. When the user rotates their seed pair, the old server seed is revealed
6. User can verify: `SHA-256(revealedSeed) === hashShownBefore`

The `/provably-fair` page provides a verification tool for all game types.

## Currency Model

- All amounts stored as **unsigned 64-bit integers** representing cents (1000 = 10.00 credits)
- No floating-point arithmetic for balance operations
- Every balance mutation writes an immutable audit trail to the `transactions` table
- Atomic transactions via SpacetimeDB reducers prevent race conditions

## Design Theme

Dark CS2-inspired gaming aesthetic:

| Token | Value |
|-------|-------|
| Background | `#0a0e17` |
| Surface | `#131926` |
| Primary accent | `#00d4ff` |
| Win / Success | `#00ff88` |
| Loss / Danger | `#ff4757` |
| Gold / Rare | `#ffd700` |
| Font (UI) | Inter |
| Font (numbers) | JetBrains Mono |

## License

Private — all rights reserved.
