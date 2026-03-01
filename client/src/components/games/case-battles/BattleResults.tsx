import { type CaseBattle } from "../../../lib/gameContext";
import { formatCredits } from "../../../lib/formatCredits";

interface BattleResultsProps {
  battle: CaseBattle;
  onBack: () => void;
}

export function BattleResults({ battle, onBack }: BattleResultsProps) {
  const sortedPlayers = [...battle.players].sort((a, b) => b.totalValue - a.totalValue);
  const winner = sortedPlayers[0];
  const totalPot = battle.costPerPlayer * battle.maxPlayers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text transition-colors mb-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Back to Lobby</span>
        </button>
        <h1 className="text-2xl font-bold text-text">Battle Complete</h1>
      </div>

      {/* Winner banner */}
      {winner && (
        <div className="card border-gold/30 glow-gold text-center py-8 animate-bounce-in">
          <div className="text-4xl mb-3">{"\u{1F3C6}"}</div>
          <div className="text-sm text-gold uppercase tracking-wide font-semibold mb-1">
            Winner
          </div>
          <div className="text-3xl font-bold text-text mb-2">{winner.username}</div>
          <div className="text-lg font-mono text-gold">
            Total Value: {formatCredits(winner.totalValue)}
          </div>
          <div className="text-sm text-text-secondary mt-2">
            Won {formatCredits(totalPot)} pot
          </div>
        </div>
      )}

      {/* All players results */}
      <div className={`grid gap-4 ${battle.maxPlayers <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
        {sortedPlayers.map((player, rank) => {
          const isWinner = rank === 0;

          return (
            <div
              key={player.userId}
              className={`
                card space-y-3
                ${isWinner ? "border-gold/30" : ""}
              `}
            >
              {/* Rank + Player */}
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${rank === 0 ? "bg-gold/20 text-gold" : ""}
                    ${rank === 1 ? "bg-text-secondary/20 text-text-secondary" : ""}
                    ${rank >= 2 ? "bg-danger/20 text-danger" : ""}
                  `}
                >
                  #{rank + 1}
                </div>
                <div>
                  <div className="font-semibold text-text text-sm">{player.username}</div>
                  <div
                    className={`text-xs font-mono ${isWinner ? "text-gold" : "text-text-secondary"}`}
                  >
                    {formatCredits(player.totalValue)}
                  </div>
                </div>
                {isWinner && (
                  <div className="ml-auto text-gold text-lg">{"\u{1F451}"}</div>
                )}
              </div>

              {/* Items won */}
              <div className="space-y-1.5">
                {player.results.map((item, i) => (
                  <div
                    key={`${item.id}-${i}`}
                    className="flex items-center justify-between py-1 px-2 rounded text-xs"
                    style={{ backgroundColor: `${item.rarityColor}08` }}
                  >
                    <span style={{ color: item.rarityColor }} className="truncate mr-2">
                      {item.name}
                    </span>
                    <span className="font-mono text-text shrink-0">
                      {formatCredits(item.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-text-secondary">Total</span>
                <span
                  className={`font-mono font-bold text-sm ${isWinner ? "text-gold" : "text-text"}`}
                >
                  {formatCredits(player.totalValue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Back button */}
      <div className="text-center">
        <button onClick={onBack} className="btn-primary px-8 py-3">
          Back to Battles
        </button>
      </div>
    </div>
  );
}
