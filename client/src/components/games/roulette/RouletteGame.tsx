import { useGame } from "../../../lib/gameContext";
import { RouletteWheel } from "./RouletteWheel";
import { RouletteBetZones } from "./RouletteBetZones";
import { RouletteHistory } from "./RouletteHistory";

export function RouletteGame() {
  const { state } = useGame();
  const round = state.roulette.currentRound;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Roulette</h1>
          <p className="text-text-secondary text-sm">
            Bet on red, green, or black. Green pays 14x.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`
              px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
              ${round.phase === "betting" ? "bg-primary/10 text-primary" : ""}
              ${round.phase === "spinning" ? "bg-gold/10 text-gold" : ""}
              ${round.phase === "result" ? "bg-success/10 text-success" : ""}
            `}
          >
            {round.phase === "betting" && `Betting (${round.countdown}s)`}
            {round.phase === "spinning" && "Spinning..."}
            {round.phase === "result" && "Result"}
          </div>
        </div>
      </div>

      {/* History */}
      <RouletteHistory history={state.roulette.history} />

      {/* Wheel */}
      <div className="game-container">
        <RouletteWheel
          phase={round.phase}
          result={round.result}
          resultColor={round.resultColor}
        />
      </div>

      {/* Bet zones */}
      <RouletteBetZones />
    </div>
  );
}
