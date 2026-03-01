import { useGame, type RouletteColor } from "../../../lib/gameContext";
import { useBetInput } from "../../../hooks/useBetInput";
import { BetInput } from "../../shared/BetInput";
import { formatCredits } from "../../../lib/formatCredits";
import { ROULETTE, ROULETTE_COLOR_MAP, COLORS } from "../../../lib/constants";

export function RouletteBetZones() {
  const { state, actions } = useGame();
  const round = state.roulette.currentRound;
  const betInput = useBetInput({ minBet: ROULETTE.MIN_BET, maxBet: ROULETTE.MAX_BET });
  const isBetting = round.phase === "betting";

  const handleBet = (color: RouletteColor) => {
    if (!isBetting || !betInput.isValid) return;
    actions.placeRouletteBet(betInput.betAmount, color);
  };

  // Count bets per color
  const betsByColor = (color: RouletteColor) =>
    round.bets.filter((b) => b.color === color);

  const totalByColor = (color: RouletteColor) =>
    betsByColor(color).reduce((sum, b) => sum + b.amount, 0);

  const zones: {
    color: RouletteColor;
    label: string;
    multiplier: string;
    bg: string;
    hoverBg: string;
  }[] = [
    {
      color: "red",
      label: "Red",
      multiplier: "2x",
      bg: "bg-danger/20 border-danger/30",
      hoverBg: "hover:bg-danger/30",
    },
    {
      color: "green",
      label: "Green",
      multiplier: "14x",
      bg: "bg-success/20 border-success/30",
      hoverBg: "hover:bg-success/30",
    },
    {
      color: "black",
      label: "Black",
      multiplier: "2x",
      bg: "bg-white/5 border-white/10",
      hoverBg: "hover:bg-white/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Bet input */}
      <div className="card">
        <BetInput
          value={betInput.inputValue}
          onChange={betInput.setInputValue}
          onHalf={betInput.half}
          onDouble={betInput.double}
          onMax={betInput.max}
          error={betInput.error}
          disabled={!isBetting}
        />
      </div>

      {/* Bet zones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {zones.map((zone) => {
          const bets = betsByColor(zone.color);
          const total = totalByColor(zone.color);
          const myBet = bets.find((b) => b.userId === state.user?.identity);

          return (
            <button
              key={zone.color}
              onClick={() => handleBet(zone.color)}
              disabled={!isBetting || !betInput.isValid}
              className={`
                card border ${zone.bg} ${zone.hoverBg}
                transition-all duration-200 text-left
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]
              `}
            >
              {/* Zone header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: ROULETTE_COLOR_MAP[zone.color] }}
                  />
                  <span className="font-bold text-text text-lg">{zone.label}</span>
                </div>
                <span
                  className="font-mono font-bold text-sm px-2 py-0.5 rounded"
                  style={{
                    color: ROULETTE_COLOR_MAP[zone.color],
                    backgroundColor: `${ROULETTE_COLOR_MAP[zone.color]}20`,
                  }}
                >
                  {zone.multiplier}
                </span>
              </div>

              {/* Stats */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total</span>
                  <span className="font-mono text-text">{formatCredits(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Players</span>
                  <span className="text-text">{bets.length}</span>
                </div>
                {myBet && (
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-primary text-xs">Your bet</span>
                    <span className="font-mono text-primary text-xs font-semibold">
                      {formatCredits(myBet.amount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Click hint */}
              {isBetting && betInput.isValid && (
                <div className="mt-3 text-center text-xs text-text-secondary">
                  Click to bet {formatCredits(betInput.betAmount)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
