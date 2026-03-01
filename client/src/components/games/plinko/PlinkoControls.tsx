import { useGame } from "../../../lib/gameContext";
import { useBetInput } from "../../../hooks/useBetInput";
import { BetInput } from "../../shared/BetInput";
import { formatCredits } from "../../../lib/formatCredits";
import { PLINKO, type PlinkoRows, type PlinkoRisk } from "../../../lib/constants";

interface PlinkoControlsProps {
  rows: PlinkoRows;
  risk: PlinkoRisk;
  onRowsChange: (rows: PlinkoRows) => void;
  onRiskChange: (risk: PlinkoRisk) => void;
}

export function PlinkoControls({
  rows,
  risk,
  onRowsChange,
  onRiskChange,
}: PlinkoControlsProps) {
  const { actions } = useGame();
  const betInput = useBetInput({ minBet: PLINKO.MIN_BET, maxBet: PLINKO.MAX_BET });

  const handleDrop = () => {
    if (!betInput.isValid) return;
    actions.dropPlinkoBall(betInput.betAmount, rows, risk);
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
        Controls
      </h3>

      {/* Bet amount */}
      <BetInput
        value={betInput.inputValue}
        onChange={betInput.setInputValue}
        onHalf={betInput.half}
        onDouble={betInput.double}
        onMax={betInput.max}
        error={betInput.error}
      />

      {/* Rows selector */}
      <div className="space-y-2">
        <label className="text-sm text-text-secondary">Rows</label>
        <div className="grid grid-cols-3 gap-2">
          {PLINKO.ROWS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => onRowsChange(r)}
              className={`
                py-2 rounded-lg font-mono font-semibold text-sm transition-all
                ${
                  rows === r
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-bg text-text-secondary border border-border hover:bg-surface-hover hover:text-text"
                }
              `}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Risk selector */}
      <div className="space-y-2">
        <label className="text-sm text-text-secondary">Risk</label>
        <div className="grid grid-cols-3 gap-2">
          {PLINKO.RISK_OPTIONS.map((r) => {
            const colorMap = {
              low: "text-success border-success/30 bg-success/10",
              medium: "text-primary border-primary/30 bg-primary/10",
              high: "text-danger border-danger/30 bg-danger/10",
            };
            const inactiveMap = {
              low: "hover:text-success",
              medium: "hover:text-primary",
              high: "hover:text-danger",
            };

            return (
              <button
                key={r}
                onClick={() => onRiskChange(r)}
                className={`
                  py-2 rounded-lg font-semibold text-sm capitalize transition-all border
                  ${
                    risk === r
                      ? colorMap[r]
                      : `bg-bg text-text-secondary border-border hover:bg-surface-hover ${inactiveMap[r]}`
                  }
                `}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Drop button */}
      <button
        onClick={handleDrop}
        disabled={!betInput.isValid}
        className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        Drop Ball ({formatCredits(betInput.betAmount)})
      </button>
    </div>
  );
}
