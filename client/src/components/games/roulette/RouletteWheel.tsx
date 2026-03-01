import { useEffect, useState, useRef } from "react";
import { ROULETTE, ROULETTE_COLOR_MAP, COLORS } from "../../../lib/constants";
import type { RoulettePhase, RouletteColor } from "../../../lib/gameContext";

interface RouletteWheelProps {
  phase: RoulettePhase;
  result: number | null;
  resultColor: RouletteColor | null;
}

// Each slot in the wheel strip
const SLOT_WIDTH = 90;
const VISIBLE_SLOTS = 50; // total rendered slots for seamless scroll

export function RouletteWheel({ phase, result, resultColor }: RouletteWheelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const animRef = useRef<number>(0);

  // Generate a long repeating strip of colors
  const slots: { color: RouletteColor; index: number }[] = [];
  for (let i = 0; i < VISIBLE_SLOTS; i++) {
    const idx = i % ROULETTE.SLOTS_COUNT;
    const color = ROULETTE.SLOT_COLORS[idx] as RouletteColor;
    slots.push({ color, index: idx });
  }

  useEffect(() => {
    if (phase === "spinning" && result !== null) {
      // Calculate target offset: land on the result slot with some extra full rotations
      const fullRotations = 3; // number of full loops
      const stripLength = ROULETTE.SLOTS_COUNT * SLOT_WIDTH;
      const targetSlotCenter = result * SLOT_WIDTH + SLOT_WIDTH / 2;
      const containerCenter = (stripRef.current?.parentElement?.offsetWidth ?? 600) / 2;

      // Total distance to scroll
      const totalOffset =
        fullRotations * stripLength + targetSlotCenter - containerCenter;

      // Animate using easing
      const duration = ROULETTE.SPIN_DURATION_MS;
      const startTime = performance.now();
      const startOffset = 0;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Cubic ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentOffset = startOffset + (totalOffset - startOffset) * eased;

        setOffset(-currentOffset);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        }
      };

      animRef.current = requestAnimationFrame(animate);
    }

    if (phase === "betting") {
      setOffset(0);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [phase, result]);

  return (
    <div className="relative h-28 overflow-hidden">
      {/* Pointer / marker */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-0.5 h-full bg-primary shadow-[0_0_10px_rgba(0,212,255,0.8)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
        <div className="w-3 h-3 bg-primary rotate-45 transform translate-y-0.5" />
      </div>

      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg to-transparent z-10" />

      {/* Scrolling strip */}
      <div
        ref={stripRef}
        className="flex items-center h-full gap-1.5 px-1 transition-none"
        style={{
          transform: `translateX(${offset}px)`,
          width: `${VISIBLE_SLOTS * (SLOT_WIDTH + 6)}px`,
        }}
      >
        {slots.map((slot, i) => {
          const isResult = phase === "result" && slot.index === result;
          const bgColor = ROULETTE_COLOR_MAP[slot.color] ?? COLORS.border;

          return (
            <div
              key={i}
              className={`
                shrink-0 flex items-center justify-center rounded-lg font-mono font-bold text-lg
                transition-all duration-300
                ${isResult ? "ring-2 ring-primary scale-105 shadow-lg" : ""}
              `}
              style={{
                width: `${SLOT_WIDTH}px`,
                height: "70px",
                backgroundColor: bgColor,
                color: slot.color === "green" ? "#0a0e17" : "#e2e8f0",
                boxShadow: isResult
                  ? `0 0 20px ${bgColor}80, 0 0 40px ${bgColor}40`
                  : undefined,
              }}
            >
              {slot.index}
            </div>
          );
        })}
      </div>

      {/* Result overlay */}
      {phase === "result" && resultColor && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div
            className="px-6 py-2 rounded-full font-bold text-lg uppercase animate-bounce-in"
            style={{
              backgroundColor: ROULETTE_COLOR_MAP[resultColor],
              color: resultColor === "green" ? "#0a0e17" : "#e2e8f0",
            }}
          >
            {resultColor === "green" ? "Green 14x" : `${resultColor} 2x`}
          </div>
        </div>
      )}
    </div>
  );
}
