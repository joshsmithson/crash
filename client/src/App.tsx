import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./lib/gameContext";
import { Layout } from "./components/layout/Layout";
import { CrashGame } from "./components/games/crash/CrashGame";
import { RouletteGame } from "./components/games/roulette/RouletteGame";
import { CoinFlipLobby } from "./components/games/coinflip/CoinFlipLobby";
import { CaseCatalog } from "./components/games/cases/CaseCatalog";
import { PlinkoGame } from "./components/games/plinko/PlinkoGame";
import { BattleLobby } from "./components/games/case-battles/BattleLobby";
import { ProvablyFairPage } from "./pages/ProvablyFairPage";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { ROUTES } from "./lib/constants";

/**
 * Home/landing page that shows a quick overview and game cards.
 */
function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-surface border border-border p-8 md:p-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-text mb-4">
            CS2 <span className="text-primary text-glow-primary">Arena</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mb-6">
            The ultimate CS2 gambling experience. Crash, Roulette, Coin Flip, Cases,
            Plinko, and Case Battles -- all provably fair.
          </p>
          <a
            href={ROUTES.CRASH}
            className="btn-primary inline-flex items-center gap-2 text-lg px-6 py-3"
          >
            <span>Play Now</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAME_CARDS.map((game) => (
          <a
            key={game.path}
            href={game.path}
            className="card-hover group p-6 flex flex-col gap-3"
          >
            <div className="text-3xl">{game.icon}</div>
            <h3 className="text-xl font-semibold text-text group-hover:text-primary transition-colors">
              {game.name}
            </h3>
            <p className="text-text-secondary text-sm">{game.description}</p>
            <div className="mt-auto pt-3 border-t border-border">
              <span className="text-primary text-sm font-medium">Play Now &rarr;</span>
            </div>
          </a>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="card text-center py-6">
            <div className="text-2xl font-mono font-bold text-primary">{stat.value}</div>
            <div className="text-text-secondary text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const GAME_CARDS = [
  {
    path: ROUTES.CRASH,
    name: "Crash",
    icon: "\u{1F680}",
    description: "Watch the multiplier rise and cash out before it crashes. High risk, high reward.",
  },
  {
    path: ROUTES.ROULETTE,
    name: "Roulette",
    icon: "\u{1F534}",
    description: "Bet on red, green, or black. Simple, fast, and thrilling.",
  },
  {
    path: ROUTES.COINFLIP,
    name: "Coin Flip",
    icon: "\u{1FA99}",
    description: "1v1 coin flip battles. Pick CT or T and go head to head.",
  },
  {
    path: ROUTES.CASES,
    name: "Cases",
    icon: "\u{1F4E6}",
    description: "Open CS2-style cases with rare skins and big payouts.",
  },
  {
    path: ROUTES.PLINKO,
    name: "Plinko",
    icon: "\u{1F53B}",
    description: "Drop balls through pegs. Choose your risk and watch them bounce.",
  },
  {
    path: ROUTES.CASE_BATTLES,
    name: "Case Battles",
    icon: "\u{2694}\u{FE0F}",
    description: "Open cases against other players. Highest total value wins all.",
  },
];

const STATS = [
  { label: "Online Players", value: "1,247" },
  { label: "Bets Today", value: "84,512" },
  { label: "Total Wagered", value: "$2.4M" },
  { label: "Games Available", value: "6" },
];

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.CRASH} element={<CrashGame />} />
            <Route path={ROUTES.ROULETTE} element={<RouletteGame />} />
            <Route path={ROUTES.COINFLIP} element={<CoinFlipLobby />} />
            <Route path={ROUTES.CASES} element={<CaseCatalog />} />
            <Route path={ROUTES.PLINKO} element={<PlinkoGame />} />
            <Route path={ROUTES.CASE_BATTLES} element={<BattleLobby />} />
            <Route path={ROUTES.PROVABLY_FAIR} element={<ProvablyFairPage />} />
            <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </GameProvider>
  );
}
