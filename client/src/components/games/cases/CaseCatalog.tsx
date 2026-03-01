import { useState } from "react";
import { useGame, type GameCase } from "../../../lib/gameContext";
import { CaseOpening } from "./CaseOpening";
import { formatCredits } from "../../../lib/formatCredits";

export function CaseCatalog() {
  const { state, actions } = useGame();
  const [selectedCase, setSelectedCase] = useState<GameCase | null>(null);

  const handleOpenCase = (cs: GameCase) => {
    if (!state.user || cs.price > state.user.balance) return;
    setSelectedCase(cs);
    actions.openCase(cs.id);
  };

  const handleClose = () => {
    setSelectedCase(null);
  };

  // If there's an active opening, show the opening view
  if (state.cases.currentOpening || selectedCase) {
    return (
      <CaseOpening
        caseData={selectedCase ?? state.cases.catalog[0]}
        opening={state.cases.currentOpening}
        onClose={handleClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Cases</h1>
        <p className="text-text-secondary text-sm">
          Open CS2-style cases for a chance at rare items
        </p>
      </div>

      {/* Case grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.cases.catalog.map((cs) => {
          const canAfford = (state.user?.balance ?? 0) >= cs.price;
          const bestItem = [...cs.items].sort((a, b) => b.value - a.value)[0];
          const totalWeight = cs.items.reduce((sum, item) => sum + item.weight, 0);

          return (
            <div
              key={cs.id}
              className="card-hover group flex flex-col"
            >
              {/* Case image / placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-surface-hover to-bg rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {/* Glow behind case */}
                <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-primary/20 to-transparent group-hover:opacity-50 transition-opacity" />

                {/* Case icon */}
                <div className="relative z-10 text-center">
                  <div className="text-6xl mb-2">{"\u{1F4E6}"}</div>
                  <div className="text-sm font-semibold text-text">{cs.name}</div>
                </div>

                {/* Best item badge */}
                {bestItem && (
                  <div
                    className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: `${bestItem.rarityColor}20`,
                      color: bestItem.rarityColor,
                      border: `1px solid ${bestItem.rarityColor}40`,
                    }}
                  >
                    {formatCredits(bestItem.value)} max
                  </div>
                )}
              </div>

              {/* Item preview */}
              <div className="space-y-1.5 mb-3 flex-1">
                <div className="text-xs text-text-secondary font-medium uppercase tracking-wide">
                  Contains {cs.items.length} items
                </div>
                <div className="flex flex-wrap gap-1">
                  {cs.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: `${item.rarityColor}15`,
                        color: item.rarityColor,
                      }}
                      title={`${item.name} - ${formatCredits(item.value)} (${((item.weight / totalWeight) * 100).toFixed(2)}%)`}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: item.rarityColor }}
                      />
                      <span className="truncate max-w-[80px]">{item.name.split("|")[1]?.trim() ?? item.name}</span>
                    </div>
                  ))}
                  {cs.items.length > 4 && (
                    <span className="text-[10px] text-text-secondary px-1.5 py-0.5">
                      +{cs.items.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Price + Open button */}
              <div className="flex items-center gap-2 mt-auto">
                <div className="flex-1">
                  <div className="text-xs text-text-secondary">Price</div>
                  <div className="text-lg font-mono font-bold text-primary">
                    {formatCredits(cs.price)}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenCase(cs)}
                  disabled={!canAfford}
                  className="btn-primary px-6 py-2.5"
                >
                  Open
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
