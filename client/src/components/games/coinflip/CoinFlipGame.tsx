import { useGame, type CoinFlipGame as CoinFlipGameType } from "../../../lib/gameContext";
import { CoinFlipAnimation } from "./CoinFlipAnimation";
import { formatCredits } from "../../../lib/formatCredits";

interface CoinFlipGameProps {
  game: CoinFlipGameType;
}

export function CoinFlipGame({ game }: CoinFlipGameProps) {
  const { state, actions } = useGame();
  const isCreator = game.creatorId === state.user?.identity;
  const canJoin = game.status === "waiting" && !isCreator && (state.user?.balance ?? 0) >= game.amount;
  const joinerSide = game.creatorSide === "CT" ? "T" : "CT";

  const handleJoin = () => {
    if (!canJoin) return;
    actions.joinCoinFlip(game.id);
  };

  const isWinner = game.winnerId === state.user?.identity;

  return (
    <div
      className={`
        card-hover relative overflow-hidden
        ${game.status === "complete" && isWinner ? "border-success/30 glow-success" : ""}
        ${game.status === "complete" && !isWinner && game.winnerId ? "border-danger/30" : ""}
      `}
    >
      {/* Status badge */}
      <div className="absolute top-3 right-3">
        <div
          className={`
            px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide
            ${game.status === "waiting" ? "bg-primary/10 text-primary" : ""}
            ${game.status === "flipping" ? "bg-gold/10 text-gold" : ""}
            ${game.status === "complete" ? "bg-success/10 text-success" : ""}
          `}
        >
          {game.status}
        </div>
      </div>

      {/* Prize pool */}
      <div className="text-center mb-4">
        <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">Prize Pool</div>
        <div className="text-2xl font-mono font-bold text-primary">
          {formatCredits(game.amount * 2)}
        </div>
      </div>

      {/* Players vs display */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Creator */}
        <div className="flex-1 text-center">
          <div
            className={`
              w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl mb-2
              ${game.creatorSide === "CT" ? "bg-primary/20" : "bg-gold/20"}
              ${game.status === "complete" && game.winnerId === game.creatorId ? "ring-2 ring-success" : ""}
            `}
          >
            {game.creatorSide === "CT" ? "\u{1F6E1}\u{FE0F}" : "\u{1F4A3}"}
          </div>
          <div className="text-sm font-semibold text-text truncate">{game.creatorName}</div>
          <div className="text-xs text-text-secondary">{game.creatorSide}</div>
          <div className="text-xs font-mono text-text-secondary mt-0.5">
            {formatCredits(game.amount)}
          </div>
        </div>

        {/* VS */}
        <div className="shrink-0">
          {game.status === "flipping" ? (
            <CoinFlipAnimation result={game.result} />
          ) : (
            <div className="w-12 h-12 rounded-full bg-border/50 flex items-center justify-center text-text-secondary font-bold text-sm">
              VS
            </div>
          )}
        </div>

        {/* Joiner */}
        <div className="flex-1 text-center">
          {game.joinerId ? (
            <>
              <div
                className={`
                  w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl mb-2
                  ${joinerSide === "CT" ? "bg-primary/20" : "bg-gold/20"}
                  ${game.status === "complete" && game.winnerId === game.joinerId ? "ring-2 ring-success" : ""}
                `}
              >
                {joinerSide === "CT" ? "\u{1F6E1}\u{FE0F}" : "\u{1F4A3}"}
              </div>
              <div className="text-sm font-semibold text-text truncate">{game.joinerName}</div>
              <div className="text-xs text-text-secondary">{joinerSide}</div>
              <div className="text-xs font-mono text-text-secondary mt-0.5">
                {formatCredits(game.amount)}
              </div>
            </>
          ) : (
            <div className="w-14 h-14 rounded-full mx-auto border-2 border-dashed border-border flex items-center justify-center text-text-secondary text-xl mb-2">
              ?
            </div>
          )}
        </div>
      </div>

      {/* Join button */}
      {game.status === "waiting" && !isCreator && (
        <button
          onClick={handleJoin}
          disabled={!canJoin}
          className="btn-primary w-full py-2.5"
        >
          Join for {formatCredits(game.amount)}
        </button>
      )}

      {/* Result */}
      {game.status === "complete" && game.result && (
        <div
          className={`
            text-center py-2 rounded-lg text-sm font-semibold
            ${game.result === "CT" ? "bg-primary/10 text-primary" : "bg-gold/10 text-gold"}
          `}
        >
          {game.result} wins!
          {isWinner && (
            <span className="text-success ml-2">+{formatCredits(game.amount)}</span>
          )}
        </div>
      )}

      {/* Your game indicator */}
      {isCreator && game.status === "waiting" && (
        <div className="text-center text-xs text-text-secondary mt-2">
          Waiting for opponent...
        </div>
      )}
    </div>
  );
}
