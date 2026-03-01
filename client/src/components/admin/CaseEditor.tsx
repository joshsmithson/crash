import { useState } from "react";
import { useGame, type GameCase, type CaseItem } from "../../lib/gameContext";
import { formatCredits, parseCredits } from "../../lib/formatCredits";
import { CASE_RARITIES, type CaseRarityKey } from "../../lib/constants";

interface EditingCase {
  id: string;
  name: string;
  price: string;
  items: EditingItem[];
}

interface EditingItem {
  tempId: string;
  name: string;
  rarity: CaseRarityKey;
  value: string;
  weight: string;
}

function newEditingItem(): EditingItem {
  return {
    tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    rarity: "MIL_SPEC",
    value: "",
    weight: "100",
  };
}

export function CaseEditor() {
  const { state } = useGame();
  const [editingCase, setEditingCase] = useState<EditingCase | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditCase = (cs: GameCase) => {
    setEditingCase({
      id: cs.id,
      name: cs.name,
      price: (cs.price / 100).toFixed(2),
      items: cs.items.map((item) => ({
        tempId: item.id,
        name: item.name,
        rarity: Object.keys(CASE_RARITIES).find(
          (k) => CASE_RARITIES[k as CaseRarityKey].color === item.rarityColor,
        ) as CaseRarityKey ?? "MIL_SPEC",
        value: (item.value / 100).toFixed(2),
        weight: item.weight.toString(),
      })),
    });
  };

  const handleNewCase = () => {
    setEditingCase({
      id: `new-${Date.now()}`,
      name: "",
      price: "",
      items: [newEditingItem()],
    });
  };

  const handleAddItem = () => {
    if (!editingCase) return;
    setEditingCase({
      ...editingCase,
      items: [...editingCase.items, newEditingItem()],
    });
  };

  const handleRemoveItem = (tempId: string) => {
    if (!editingCase) return;
    setEditingCase({
      ...editingCase,
      items: editingCase.items.filter((i) => i.tempId !== tempId),
    });
  };

  const handleItemChange = (tempId: string, field: keyof EditingItem, value: string) => {
    if (!editingCase) return;
    setEditingCase({
      ...editingCase,
      items: editingCase.items.map((i) =>
        i.tempId === tempId ? { ...i, [field]: value } : i,
      ),
    });
  };

  const handleSave = async () => {
    if (!editingCase) return;
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setEditingCase(null);
  };

  if (editingCase) {
    const totalWeight = editingCase.items.reduce((s, i) => s + (parseInt(i.weight) || 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setEditingCase(null)}
              className="flex items-center gap-2 text-text-secondary hover:text-text transition-colors mb-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back to Cases</span>
            </button>
            <h2 className="text-xl font-bold text-text">
              {editingCase.name || "New Case"}
            </h2>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-success flex items-center gap-2"
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isSaving ? "Saving..." : "Save Case"}
          </button>
        </div>

        {/* Case details */}
        <div className="card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary font-medium">Case Name</label>
              <input
                type="text"
                value={editingCase.name}
                onChange={(e) => setEditingCase({ ...editingCase, name: e.target.value })}
                placeholder="e.g., Danger Zone"
                className="input-field w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary font-medium">Price (credits)</label>
              <input
                type="text"
                value={editingCase.price}
                onChange={(e) => setEditingCase({ ...editingCase, price: e.target.value })}
                placeholder="0.00"
                className="input-field w-full"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Items ({editingCase.items.length}) &middot; Total Weight: {totalWeight}
            </h3>
            <button onClick={handleAddItem} className="btn-primary text-sm px-3 py-1.5">
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {editingCase.items.map((item) => {
              const weight = parseInt(item.weight) || 0;
              const chance = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(2) : "0";
              const rarityInfo = CASE_RARITIES[item.rarity];

              return (
                <div
                  key={item.tempId}
                  className="bg-bg rounded-xl p-4 border border-border space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-xs text-text-secondary">Item Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.tempId, "name", e.target.value)}
                        placeholder="AK-47 | Redline"
                        className="input-field w-full text-sm"
                      />
                    </div>

                    {/* Rarity */}
                    <div className="space-y-1">
                      <label className="text-xs text-text-secondary">Rarity</label>
                      <select
                        value={item.rarity}
                        onChange={(e) =>
                          handleItemChange(item.tempId, "rarity", e.target.value)
                        }
                        className="input-field w-full text-sm bg-bg"
                      >
                        {(Object.keys(CASE_RARITIES) as CaseRarityKey[]).map((key) => (
                          <option key={key} value={key}>
                            {CASE_RARITIES[key].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Value */}
                    <div className="space-y-1">
                      <label className="text-xs text-text-secondary">Value (credits)</label>
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => handleItemChange(item.tempId, "value", e.target.value)}
                        placeholder="0.00"
                        className="input-field w-full text-sm"
                      />
                    </div>

                    {/* Weight */}
                    <div className="space-y-1">
                      <label className="text-xs text-text-secondary">
                        Weight ({chance}%)
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={item.weight}
                          onChange={(e) =>
                            handleItemChange(item.tempId, "weight", e.target.value)
                          }
                          placeholder="100"
                          className="input-field flex-1 text-sm"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.tempId)}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rarity color preview */}
                  <div
                    className="h-1 rounded-full"
                    style={{ backgroundColor: rarityInfo.color }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Cases ({state.cases.catalog.length})</h2>
        <button onClick={handleNewCase} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Case
        </button>
      </div>

      <div className="space-y-3">
        {state.cases.catalog.map((cs) => (
          <div
            key={cs.id}
            className="card-hover flex items-center gap-4 p-4 cursor-pointer"
            onClick={() => handleEditCase(cs)}
          >
            <div className="w-12 h-12 rounded-lg bg-bg border border-border flex items-center justify-center text-2xl shrink-0">
              {"\u{1F4E6}"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text">{cs.name}</div>
              <div className="text-xs text-text-secondary">
                {cs.items.length} items &middot; Price: {formatCredits(cs.price)}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {cs.items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.rarityColor }}
                />
              ))}
            </div>
            <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
