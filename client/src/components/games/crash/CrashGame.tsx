import { useGame } from "../../../lib/gameContext";
import { CrashCanvas } from "./CrashCanvas";
import { CrashBetPanel } from "./CrashBetPanel";
import { CrashBetList } from "./CrashBetList";
import { CrashHistory } from "./CrashHistory";

export function CrashGame() {
  const { state } = useGame();
  const round = state.crash.currentRound;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Crash</h1>
          <p className="text-text-secondary text-sm">
            Watch the multiplier rise and cash out before it crashes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`
              px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
              ${round.phase === "waiting" ? "bg-primary/10 text-primary" : ""}
              ${round.phase === "running" ? "bg-success/10 text-success" : ""}
              ${round.phase === "crashed" ? "bg-danger/10 text-danger" : ""}
            `}
          >
            {round.phase === "waiting" && `Starting in ${round.countdown}s`}
            {round.phase === "running" && "Live"}
            {round.phase === "crashed" && "Crashed"}
          </div>
        </div>
      </div>

      {/* History strip */}
      <CrashHistory history={state.crash.history} />

      {/* Main game area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas + Bet panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="game-container">
            <CrashCanvas
              phase={round.phase}
              currentMultiplier={round.currentMultiplier}
              crashPoint={round.crashPoint}
              countdown={round.countdown}
            />
          </div>
          <CrashBetPanel />
        </div>

        {/* Bet list */}
        <div className="lg:col-span-1">
          <CrashBetList bets={round.bets} phase={round.phase} />
        </div>
      </div>
    </div>
  );
}
