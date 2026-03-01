import { formatCredits, formatMultiplier } from "../../lib/formatCredits";

export interface HistoryEntry {
  id: string;
  game: string;
  timestamp: number;
  betAmount: number;
  multiplier: number;
  profit: number;
  result: string;
}

interface GameHistoryProps {
  entries: HistoryEntry[];
  title?: string;
  showGame?: boolean;
  maxEntries?: number;
}

export function GameHistory({
  entries,
  title = "Game History",
  showGame = true,
  maxEntries = 50,
}: GameHistoryProps) {
  const displayed = entries.slice(0, maxEntries);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        {title}
      </h3>

      {displayed.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No history yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {showGame && (
                  <th className="text-left py-2 px-2 text-text-secondary font-medium text-xs">
                    Game
                  </th>
                )}
                <th className="text-left py-2 px-2 text-text-secondary font-medium text-xs">
                  Time
                </th>
                <th className="text-right py-2 px-2 text-text-secondary font-medium text-xs">
                  Bet
                </th>
                <th className="text-right py-2 px-2 text-text-secondary font-medium text-xs">
                  Multi
                </th>
                <th className="text-right py-2 px-2 text-text-secondary font-medium text-xs">
                  Profit
                </th>
                <th className="text-right py-2 px-2 text-text-secondary font-medium text-xs">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((entry) => {
                const isWin = entry.profit > 0;
                const isLoss = entry.profit < 0;

                return (
                  <tr
                    key={entry.id}
                    className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                  >
                    {showGame && (
                      <td className="py-2.5 px-2">
                        <span className="text-xs font-medium text-text capitalize">
                          {entry.game}
                        </span>
                      </td>
                    )}
                    <td className="py-2.5 px-2 text-xs text-text-secondary">
                      {formatTime(entry.timestamp)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs text-text">
                      {formatCredits(entry.betAmount)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs">
                      <span
                        className={
                          entry.multiplier >= 2
                            ? "text-success"
                            : entry.multiplier >= 1
                            ? "text-primary"
                            : "text-danger"
                        }
                      >
                        {formatMultiplier(entry.multiplier)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs">
                      <span className={isWin ? "text-success" : isLoss ? "text-danger" : "text-text-secondary"}>
                        {isWin ? "+" : ""}
                        {formatCredits(entry.profit)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span
                        className={`
                          inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold
                          ${isWin ? "bg-success/10 text-success" : ""}
                          ${isLoss ? "bg-danger/10 text-danger" : ""}
                          ${!isWin && !isLoss ? "bg-text-secondary/10 text-text-secondary" : ""}
                        `}
                      >
                        {entry.result}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {entries.length > maxEntries && (
        <div className="text-center pt-3 text-xs text-text-secondary">
          Showing {maxEntries} of {entries.length} entries
        </div>
      )}
    </div>
  );
}
