import type { CrashHistoryEntry } from "../../../lib/gameContext";

interface CrashHistoryProps {
  history: CrashHistoryEntry[];
}

export function CrashHistory({ history }: CrashHistoryProps) {
  return (
    <div className="card py-3 px-4">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin pb-1">
        <span className="text-xs text-text-secondary shrink-0 font-medium uppercase tracking-wide">
          History
        </span>
        {history.map((entry, i) => {
          const isGreen = entry.crashPoint >= 2;
          const isGold = entry.crashPoint >= 10;

          return (
            <div
              key={entry.roundId + i}
              className={`
                shrink-0 px-3 py-1 rounded-full text-xs font-mono font-bold cursor-default
                transition-all duration-200 hover:scale-110
                ${
                  isGold
                    ? "bg-gold/15 text-gold border border-gold/30"
                    : isGreen
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-danger/10 text-danger border border-danger/20"
                }
              `}
              title={`Round ${entry.roundId} - Crashed at ${entry.crashPoint.toFixed(2)}x`}
            >
              {entry.crashPoint.toFixed(2)}x
            </div>
          );
        })}
        {history.length === 0 && (
          <span className="text-xs text-text-secondary">No history yet</span>
        )}
      </div>
    </div>
  );
}
