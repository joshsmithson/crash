import { ROULETTE_COLOR_MAP } from "../../../lib/constants";
import type { RouletteHistoryEntry } from "../../../lib/gameContext";

interface RouletteHistoryProps {
  history: RouletteHistoryEntry[];
}

export function RouletteHistory({ history }: RouletteHistoryProps) {
  return (
    <div className="card py-3 px-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary shrink-0 font-medium uppercase tracking-wide mr-1">
          Last 100
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {history.map((entry, i) => (
            <div
              key={`${entry.roundId}-${i}`}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-transform hover:scale-125 cursor-default"
              style={{
                backgroundColor: ROULETTE_COLOR_MAP[entry.color],
                color: entry.color === "green" ? "#0a0e17" : "#e2e8f0",
              }}
              title={`Round ${entry.roundId} - ${entry.color} (${entry.result})`}
            >
              {entry.result}
            </div>
          ))}
          {history.length === 0 && (
            <span className="text-xs text-text-secondary">No history yet</span>
          )}
        </div>
      </div>
    </div>
  );
}
