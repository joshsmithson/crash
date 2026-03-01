import { useState } from "react";
import { useGame } from "../../../lib/gameContext";
import { PlinkoBoard } from "./PlinkoBoard";
import { PlinkoControls } from "./PlinkoControls";
import { formatCredits, formatMultiplier } from "../../../lib/formatCredits";
import type { PlinkoRows, PlinkoRisk } from "../../../lib/constants";

export function PlinkoGame() {
  const { state } = useGame();
  const [rows, setRows] = useState<PlinkoRows>(12);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Plinko</h1>
        <p className="text-text-secondary text-sm">
          Drop balls through pegs. Choose your risk level and watch them bounce.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <PlinkoControls
            rows={rows}
            risk={risk}
            onRowsChange={setRows}
            onRiskChange={setRisk}
          />

          {/* History */}
          <div className="card">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Recent Drops
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {state.plinko.history.length === 0 ? (
                <div className="text-center text-text-secondary text-sm py-6">
                  No drops yet
                </div>
              ) : (
                state.plinko.history.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-hover text-sm"
                  >
                    <span
                      className={`font-mono font-bold ${
                        entry.multiplier >= 2
                          ? "text-success"
                          : entry.multiplier >= 1
                          ? "text-primary"
                          : "text-danger"
                      }`}
                    >
                      {formatMultiplier(entry.multiplier)}
                    </span>
                    <span
                      className={`font-mono ${
                        entry.profit >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {entry.profit >= 0 ? "+" : ""}
                      {formatCredits(entry.profit)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="lg:col-span-2">
          <div className="game-container">
            <PlinkoBoard
              rows={rows}
              risk={risk}
              balls={state.plinko.balls}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
