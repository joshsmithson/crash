import { useState } from "react";
import { useGame } from "../../../lib/gameContext";
import { useBetInput } from "../../../hooks/useBetInput";
import { BetInput } from "../../shared/BetInput";
import { formatCredits, formatMultiplier } from "../../../lib/formatCredits";
import { CRASH } from "../../../lib/constants";

export function CrashBetPanel() {
  const { state, actions } = useGame();
  const round = state.crash.currentRound;
  const betInput = useBetInput({ minBet: CRASH.MIN_BET, maxBet: CRASH.MAX_BET });

  const [autoCashoutInput, setAutoCashoutInput] = useState("2.00");
  const [useAutoCashout, setUseAutoCashout] = useState(false);

  const myBet = round.bets.find(
    (b) => b.userId === state.user?.identity && !b.cashedOutAt,
  );
  const myCashedOut = round.bets.find(
    (b) => b.userId === state.user?.identity && b.cashedOutAt,
  );

  const autoCashoutValue = parseFloat(autoCashoutInput) || 0;
  const autoCashoutValid =
    autoCashoutValue >= CRASH.MIN_AUTO_CASHOUT &&
    autoCashoutValue <= CRASH.MAX_AUTO_CASHOUT;

  const handlePlaceBet = () => {
    if (!betInput.isValid) return;
    const autoCashout = useAutoCashout && autoCashoutValid ? autoCashoutValue : null;
    actions.placeCrashBet(betInput.betAmount, autoCashout);
  };

  const handleCashout = () => {
    actions.cashoutCrash();
  };

  const potentialProfit = myBet
    ? Math.floor(myBet.amount * round.currentMultiplier) - myBet.amount
    : 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Place Bet
        </h3>
        {round.phase === "waiting" && (
          <span className="text-xs text-primary font-mono">
            Round starting in {round.countdown}s
          </span>
        )}
      </div>

      {/* Bet amount input */}
      <BetInput
        value={betInput.inputValue}
        onChange={betInput.setInputValue}
        onHalf={betInput.half}
        onDouble={betInput.double}
        onMax={betInput.max}
        error={betInput.error}
        disabled={round.phase !== "waiting" || !!myBet}
      />

      {/* Auto Cashout */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useAutoCashout}
              onChange={(e) => setUseAutoCashout(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-bg text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-text-secondary">Auto Cashout</span>
          </label>
        </div>
        {useAutoCashout && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={autoCashoutInput}
              onChange={(e) => setAutoCashoutInput(e.target.value)}
              placeholder="2.00"
              className="input-field flex-1 text-sm"
              disabled={round.phase !== "waiting"}
            />
            <span className="text-text-secondary text-sm">x</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {round.phase === "waiting" && !myBet && (
          <button
            onClick={handlePlaceBet}
            disabled={!betInput.isValid}
            className="btn-primary w-full py-3 text-base"
          >
            Place Bet ({formatCredits(betInput.betAmount)})
          </button>
        )}

        {round.phase === "waiting" && myBet && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
            <div className="text-sm text-primary font-medium">Bet Placed</div>
            <div className="text-lg font-mono font-bold text-text">
              {formatCredits(myBet.amount)}
            </div>
          </div>
        )}

        {round.phase === "running" && myBet && !myCashedOut && (
          <button
            onClick={handleCashout}
            className="btn-success w-full py-4 text-lg animate-pulse-glow"
          >
            <div className="flex flex-col items-center">
              <span className="text-bg font-bold">
                Cash Out @ {formatMultiplier(round.currentMultiplier)}
              </span>
              <span className="text-bg/70 text-sm">
                +{formatCredits(potentialProfit)} profit
              </span>
            </div>
          </button>
        )}

        {round.phase === "running" && !myBet && (
          <div className="bg-surface-hover rounded-lg p-3 text-center">
            <div className="text-sm text-text-secondary">
              Wait for next round to place a bet
            </div>
          </div>
        )}

        {round.phase === "running" && myCashedOut && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
            <div className="text-sm text-success font-medium">Cashed Out!</div>
            <div className="text-lg font-mono font-bold text-success">
              {formatMultiplier(myCashedOut.cashedOutAt!)} &middot; +{formatCredits(myCashedOut.profit)}
            </div>
          </div>
        )}

        {round.phase === "crashed" && (
          <div className="text-center py-2">
            {myCashedOut ? (
              <div className="text-success font-semibold">
                You won {formatCredits(myCashedOut.profit)}!
              </div>
            ) : myBet ? (
              <div className="text-danger font-semibold">
                Busted! Lost {formatCredits(myBet.amount)}
              </div>
            ) : (
              <div className="text-text-secondary text-sm">
                New round starting soon...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
