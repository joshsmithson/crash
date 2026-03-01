import { useEffect, useRef, useState } from "react";
import { formatCredits } from "../../lib/formatCredits";

interface BalanceDisplayProps {
  balance: number;
  className?: string;
}

export function BalanceDisplay({ balance, className = "" }: BalanceDisplayProps) {
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const prevBalance = useRef(balance);
  const animRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (balance === prevBalance.current) return;

    const diff = balance - prevBalance.current;
    setDirection(diff > 0 ? "up" : "down");
    setIsAnimating(true);

    // Animate the balance change
    const start = prevBalance.current;
    const target = balance;
    const duration = 500; // ms
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      setDisplayBalance(current);

      if (progress >= 1) {
        clearInterval(animRef.current);
        setIsAnimating(false);
        setDirection(null);
      }
    };

    clearInterval(animRef.current);
    animRef.current = setInterval(tick, 16);
    prevBalance.current = balance;

    return () => clearInterval(animRef.current);
  }, [balance]);

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg border border-border
        transition-all duration-300
        ${isAnimating && direction === "up" ? "border-success/50" : ""}
        ${isAnimating && direction === "down" ? "border-danger/50" : ""}
        ${className}
      `}
    >
      {/* Credit icon */}
      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <svg className="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">
            $
          </text>
        </svg>
      </div>

      {/* Balance value */}
      <span
        className={`
          font-mono font-bold text-sm tabular-nums transition-colors duration-300
          ${isAnimating && direction === "up" ? "text-success" : ""}
          ${isAnimating && direction === "down" ? "text-danger" : ""}
          ${!isAnimating ? "text-text" : ""}
        `}
      >
        {formatCredits(displayBalance)}
      </span>

      {/* Change indicator */}
      {isAnimating && direction && (
        <div
          className={`
            text-xs font-mono font-semibold animate-slide-up
            ${direction === "up" ? "text-success" : "text-danger"}
          `}
        >
          {direction === "up" ? "\u25B2" : "\u25BC"}
        </div>
      )}
    </div>
  );
}
