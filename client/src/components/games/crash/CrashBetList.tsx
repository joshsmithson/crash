import { formatCredits, formatMultiplier } from "../../../lib/formatCredits";
import type { CrashBet, CrashPhase } from "../../../lib/gameContext";

interface CrashBetListProps {
  bets: CrashBet[];
  phase: CrashPhase;
}

export function CrashBetList({ bets, phase }: CrashBetListProps) {
  const sortedBets = [...bets].sort((a, b) => {
    // Cashed out bets first, then by amount desc
    if (a.cashedOutAt && !b.cashedOutAt) return -1;
    if (!a.cashedOutAt && b.cashedOutAt) return 1;
    return b.amount - a.amount;
  });

  const totalBets = bets.length;
  const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Bets
        </h3>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span>{totalBets} players</span>
          <span className="font-mono">{formatCredits(totalWagered)}</span>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-4 gap-2 text-xs text-text-secondary font-medium pb-2 px-1">
        <div>Player</div>
        <div className="text-right">Bet</div>
        <div className="text-right">Cashout</div>
        <div className="text-right">Profit</div>
      </div>

      {/* Bet rows */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {sortedBets.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-text-secondary text-sm">
            No bets yet
          </div>
        ) : (
          sortedBets.map((bet) => {
            const isActive = !bet.cashedOutAt && phase === "running";
            const isCashedOut = !!bet.cashedOutAt;
            const isBusted = !bet.cashedOutAt && phase === "crashed";

            return (
              <div
                key={bet.id}
                className={`
                  grid grid-cols-4 gap-2 py-2 px-2 rounded-lg text-sm transition-colors
                  ${isActive ? "bg-primary/5 border border-primary/10" : ""}
                  ${isCashedOut ? "bg-success/5" : ""}
                  ${isBusted ? "bg-danger/5 opacity-60" : ""}
                `}
              >
                {/* Player name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold shrink-0">
                    {bet.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-text truncate text-xs">{bet.username}</span>
                </div>

                {/* Bet amount */}
                <div className="text-right font-mono text-xs text-text">
                  {formatCredits(bet.amount)}
                </div>

                {/* Cashout */}
                <div className="text-right font-mono text-xs">
                  {isCashedOut ? (
                    <span className="text-success font-semibold">
                      {formatMultiplier(bet.cashedOutAt!)}
                    </span>
                  ) : isActive ? (
                    <span className="text-primary animate-pulse">...</span>
                  ) : isBusted ? (
                    <span className="text-danger">---</span>
                  ) : (
                    <span className="text-text-secondary">-</span>
                  )}
                </div>

                {/* Profit */}
                <div className="text-right font-mono text-xs">
                  {isCashedOut ? (
                    <span className="text-success">+{formatCredits(bet.profit)}</span>
                  ) : isBusted ? (
                    <span className="text-danger">-{formatCredits(bet.amount)}</span>
                  ) : (
                    <span className="text-text-secondary">-</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
