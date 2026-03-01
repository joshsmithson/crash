import { type CaseBattle } from "../../../lib/gameContext";
import { formatCredits } from "../../../lib/formatCredits";

interface BattleGameProps {
  battle: CaseBattle;
  onBack: () => void;
}

export function BattleGame({ battle, onBack }: BattleGameProps) {
  const roundLabel = battle.currentRound > 0
    ? `Round ${battle.currentRound} / ${battle.totalRounds}`
    : "Starting...";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <h1 className="text-2xl font-bold text-text">Case Battle</h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-text-secondary">{roundLabel}</div>
          <div
            className={`
              px-3 py-1 rounded-full text-xs font-semibold uppercase mt-1 inline-block
              ${battle.status === "in_progress" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}
            `}
          >
            {battle.status.replace("_", " ")}
          </div>
        </div>
      </div>

      {/* Cases being opened */}
      <div className="card py-3 px-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="font-medium">Cases:</span>
          {battle.cases.map((cs, i) => (
            <span
              key={`${cs.id}-${i}`}
              className="px-2 py-0.5 bg-bg rounded text-text text-xs border border-border"
            >
              {cs.name}
            </span>
          ))}
        </div>
      </div>

      {/* Player columns */}
      <div className={`grid gap-4 ${battle.maxPlayers <= 2 ? "grid-cols-2" : battle.maxPlayers <= 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {battle.players.map((player) => {
          const isLeading = battle.players.every((p) => p.totalValue <= player.totalValue);

          return (
            <div
              key={player.userId}
              className={`
                card space-y-3
                ${isLeading && battle.players.length > 1 ? "border-primary/30 glow-primary" : ""}
              `}
            >
              {/* Player header */}
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-text text-sm">{player.username}</div>
                  <div className="text-xs font-mono text-primary">
                    Total: {formatCredits(player.totalValue)}
                  </div>
                </div>
                {isLeading && battle.players.length > 1 && (
                  <div className="ml-auto">
                    <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="space-y-2">
                {player.results.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-sm">
                    Waiting for round...
                  </div>
                ) : (
                  player.results.map((item, i) => (
                    <div
                      key={`${item.id}-${i}`}
                      className="flex items-center gap-2 p-2 rounded-lg animate-slide-up"
                      style={{
                        backgroundColor: `${item.rarityColor}08`,
                        borderLeft: `3px solid ${item.rarityColor}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-sm shrink-0"
                        style={{ backgroundColor: `${item.rarityColor}15` }}
                      >
                        {"\u{1F52B}"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-medium truncate"
                          style={{ color: item.rarityColor }}
                        >
                          {item.name}
                        </div>
                        <div className="text-xs font-mono text-text">
                          {formatCredits(item.value)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Running total bar */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Total Value</span>
                  <span className="font-mono font-bold text-primary">
                    {formatCredits(player.totalValue)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty slots */}
        {Array.from({ length: battle.maxPlayers - battle.players.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="card flex items-center justify-center py-16 border-dashed"
          >
            <div className="text-center">
              <div className="text-4xl text-text-secondary/30 mb-2">?</div>
              <div className="text-sm text-text-secondary">Waiting for player...</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
