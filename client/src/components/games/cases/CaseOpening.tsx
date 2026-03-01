import { useGame, type GameCase, type CaseOpeningResult } from "../../../lib/gameContext";
import { CaseSpinner } from "./CaseSpinner";
import { formatCredits } from "../../../lib/formatCredits";

interface CaseOpeningProps {
  caseData: GameCase;
  opening: CaseOpeningResult | null;
  onClose: () => void;
}

export function CaseOpening({ caseData, opening, onClose }: CaseOpeningProps) {
  const { actions } = useGame();

  const handleOpenAnother = () => {
    actions.openCase(caseData.id);
  };

  const wonItem = opening?.item;
  const isSpinning = opening?.spinning ?? false;
  const isRevealed = opening && !opening.spinning;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-text-secondary hover:text-text transition-colors mb-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Cases</span>
          </button>
          <h1 className="text-2xl font-bold text-text">{caseData.name}</h1>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-secondary">Case Price</div>
          <div className="text-lg font-mono font-bold text-primary">
            {formatCredits(caseData.price)}
          </div>
        </div>
      </div>

      {/* Spinner */}
      <div className="game-container">
        <div className="p-6">
          <CaseSpinner
            items={caseData.items}
            wonItem={wonItem ?? null}
            spinning={isSpinning}
          />
        </div>
      </div>

      {/* Result */}
      {isRevealed && wonItem && (
        <div className="card animate-bounce-in text-center space-y-3">
          <div className="text-sm text-text-secondary uppercase tracking-wide">
            You won!
          </div>
          <div
            className="text-xl font-bold"
            style={{ color: wonItem.rarityColor }}
          >
            {wonItem.name}
          </div>
          <div className="text-3xl font-mono font-bold text-success text-glow-success">
            {formatCredits(wonItem.value)}
          </div>
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${wonItem.rarityColor}20`,
              color: wonItem.rarityColor,
              border: `1px solid ${wonItem.rarityColor}40`,
            }}
          >
            {wonItem.rarity.replace("_", " ")}
          </div>

          <div className="flex items-center justify-center gap-3 pt-3">
            <button onClick={handleOpenAnother} className="btn-primary px-6 py-2.5">
              Open Another ({formatCredits(caseData.price)})
            </button>
            <button onClick={onClose} className="btn-ghost px-6 py-2.5">
              Back to Cases
            </button>
          </div>
        </div>
      )}

      {/* Items in case */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Case Contents
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[...caseData.items]
            .sort((a, b) => b.value - a.value)
            .map((item) => {
              const totalWeight = caseData.items.reduce((s, i) => s + i.weight, 0);
              const chance = ((item.weight / totalWeight) * 100).toFixed(2);

              return (
                <div
                  key={item.id}
                  className="bg-bg rounded-lg p-3 border border-border hover:border-opacity-50 transition-colors"
                  style={{ borderColor: `${item.rarityColor}30` }}
                >
                  {/* Item image placeholder */}
                  <div
                    className="h-16 rounded mb-2 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${item.rarityColor}10` }}
                  >
                    {"\u{1F52B}"}
                  </div>
                  <div className="text-xs font-medium text-text truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono" style={{ color: item.rarityColor }}>
                      {formatCredits(item.value)}
                    </span>
                    <span className="text-[10px] text-text-secondary">{chance}%</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
