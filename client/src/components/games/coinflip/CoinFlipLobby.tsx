import { useState } from "react";
import { useGame, type CoinSide } from "../../../lib/gameContext";
import { useBetInput } from "../../../hooks/useBetInput";
import { BetInput } from "../../shared/BetInput";
import { CoinFlipGame } from "./CoinFlipGame";
import { formatCredits } from "../../../lib/formatCredits";
import { COINFLIP } from "../../../lib/constants";

export function CoinFlipLobby() {
  const { state, actions } = useGame();
  const betInput = useBetInput({ minBet: COINFLIP.MIN_BET, maxBet: COINFLIP.MAX_BET });
  const [selectedSide, setSelectedSide] = useState<CoinSide>("CT");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = () => {
    if (!betInput.isValid) return;
    actions.createCoinFlip(betInput.betAmount, selectedSide);
    setShowCreateForm(false);
  };

  const waitingGames = state.coinflip.games.filter((g) => g.status === "waiting");
  const activeGames = state.coinflip.games.filter((g) => g.status !== "waiting");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Coin Flip</h1>
          <p className="text-text-secondary text-sm">
            1v1 coin flips. Pick your side and bet.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Game
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="card animate-slide-down space-y-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Create Coin Flip
          </h3>

          <BetInput
            value={betInput.inputValue}
            onChange={betInput.setInputValue}
            onHalf={betInput.half}
            onDouble={betInput.double}
            onMax={betInput.max}
            error={betInput.error}
          />

          {/* Side selector */}
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Choose your side</label>
            <div className="grid grid-cols-2 gap-3">
              {(["CT", "T"] as CoinSide[]).map((side) => (
                <button
                  key={side}
                  onClick={() => setSelectedSide(side)}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200 text-center
                    ${
                      selectedSide === side
                        ? side === "CT"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gold bg-gold/10 text-gold"
                        : "border-border bg-surface hover:bg-surface-hover text-text-secondary"
                    }
                  `}
                >
                  <div className="text-3xl mb-1">{side === "CT" ? "\u{1F6E1}\u{FE0F}" : "\u{1F4A3}"}</div>
                  <div className="font-bold text-lg">{side}</div>
                  <div className="text-xs opacity-70">
                    {side === "CT" ? "Counter-Terrorist" : "Terrorist"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!betInput.isValid}
            className="btn-primary w-full py-3"
          >
            Create for {formatCredits(betInput.betAmount)} credits
          </button>
        </div>
      )}

      {/* Open games */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-3">
          Open Games ({waitingGames.length})
        </h2>
        {waitingGames.length === 0 ? (
          <div className="card text-center py-12 text-text-secondary">
            No open games. Create one to start!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {waitingGames.map((game) => (
              <CoinFlipGame key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>

      {/* Active / completed games */}
      {activeGames.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text mb-3">
            Recent Games ({activeGames.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGames.map((game) => (
              <CoinFlipGame key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
