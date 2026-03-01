import { useEffect, useState } from "react";
import type { CoinSide } from "../../../lib/gameContext";

interface CoinFlipAnimationProps {
  result: CoinSide | null;
}

export function CoinFlipAnimation({ result }: CoinFlipAnimationProps) {
  const [flipping, setFlipping] = useState(true);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!result) {
      setFlipping(true);
      setShowResult(false);
      return;
    }

    // Start flipping
    setFlipping(true);
    setShowResult(false);

    // Stop flipping and show result after animation
    const timer = setTimeout(() => {
      setFlipping(false);
      setShowResult(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [result]);

  return (
    <div className="relative" style={{ perspective: "200px" }}>
      <div
        className={`
          w-16 h-16 relative transition-transform
          ${flipping ? "animate-spin-coin" : ""}
        `}
        style={{
          transformStyle: "preserve-3d",
          transform: showResult
            ? result === "CT"
              ? "rotateY(0deg)"
              : "rotateY(180deg)"
            : undefined,
        }}
      >
        {/* CT side (front) */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 text-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-primary font-bold text-xs">CT</span>
        </div>

        {/* T side (back) */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center bg-gradient-to-br from-gold/30 to-gold/10 border-2 border-gold/40 text-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <span className="text-gold font-bold text-xs">T</span>
        </div>
      </div>

      {/* Glow effect while spinning */}
      {flipping && (
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-md animate-pulse" />
      )}
    </div>
  );
}
