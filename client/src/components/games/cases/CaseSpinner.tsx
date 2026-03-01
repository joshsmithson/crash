import { useEffect, useRef, useState } from "react";
import type { CaseItem } from "../../../lib/gameContext";
import { formatCredits } from "../../../lib/formatCredits";

interface CaseSpinnerProps {
  items: CaseItem[];
  wonItem: CaseItem | null;
  spinning: boolean;
}

const ITEM_WIDTH = 140;
const ITEM_GAP = 8;
const VISIBLE_COUNT = 40; // total items rendered in the strip

export function CaseSpinner({ items, wonItem, spinning }: CaseSpinnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Generate a long strip of shuffled items, with the won item placed near the end
  const [strip, setStrip] = useState<CaseItem[]>([]);

  useEffect(() => {
    if (spinning && wonItem) {
      setRevealed(false);

      // Build strip: random items, then place the won item at a specific index
      const winIndex = VISIBLE_COUNT - 8; // Place near the end
      const newStrip: CaseItem[] = [];

      for (let i = 0; i < VISIBLE_COUNT; i++) {
        if (i === winIndex) {
          newStrip.push(wonItem);
        } else {
          // Random item from the pool (weighted)
          const totalWeight = items.reduce((s, item) => s + item.weight, 0);
          let roll = Math.random() * totalWeight;
          let picked = items[0];
          for (const item of items) {
            roll -= item.weight;
            if (roll <= 0) {
              picked = item;
              break;
            }
          }
          newStrip.push(picked);
        }
      }

      setStrip(newStrip);

      // Calculate scroll distance
      const containerWidth = containerRef.current?.offsetWidth ?? 600;
      const centerOfContainer = containerWidth / 2;
      const targetCenter = winIndex * (ITEM_WIDTH + ITEM_GAP) + ITEM_WIDTH / 2;
      const scrollDistance = targetCenter - centerOfContainer;

      // Small random offset for natural feel
      const jitter = (Math.random() - 0.5) * (ITEM_WIDTH * 0.6);
      setTranslateX(-(scrollDistance + jitter));

      // Reveal after animation completes
      const timer = setTimeout(() => {
        setRevealed(true);
      }, 4200);

      return () => clearTimeout(timer);
    }

    if (!spinning && !wonItem) {
      setTranslateX(0);
      setRevealed(false);
      setStrip([]);
    }
  }, [spinning, wonItem, items]);

  return (
    <div className="relative">
      {/* Pointer/marker */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-20 w-0.5 bg-primary" />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20">
        <div className="w-3 h-3 bg-primary rotate-45 transform" />
      </div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20">
        <div className="w-3 h-3 bg-primary rotate-45 transform" />
      </div>

      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />

      {/* Strip container */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg"
        style={{ height: "160px" }}
      >
        {strip.length > 0 ? (
          <div
            ref={stripRef}
            className="flex items-center h-full gap-2"
            style={{
              transform: `translateX(${translateX}px)`,
              transition: spinning
                ? "transform 4s cubic-bezier(0.15, 0.85, 0.35, 1)"
                : "none",
              width: `${VISIBLE_COUNT * (ITEM_WIDTH + ITEM_GAP)}px`,
            }}
          >
            {strip.map((item, i) => {
              const isWon = revealed && item === wonItem && i === VISIBLE_COUNT - 8;

              return (
                <div
                  key={`${item.id}-${i}`}
                  className={`
                    shrink-0 rounded-lg border-2 p-2 flex flex-col items-center justify-center
                    transition-all duration-300
                    ${isWon ? "scale-105 shadow-lg" : ""}
                  `}
                  style={{
                    width: `${ITEM_WIDTH}px`,
                    height: "140px",
                    borderColor: isWon ? item.rarityColor : `${item.rarityColor}40`,
                    backgroundColor: isWon ? `${item.rarityColor}15` : `${item.rarityColor}08`,
                    boxShadow: isWon ? `0 0 30px ${item.rarityColor}40` : undefined,
                  }}
                >
                  {/* Item icon */}
                  <div className="text-3xl mb-1">{"\u{1F52B}"}</div>

                  {/* Item name */}
                  <div
                    className="text-[10px] font-medium text-center truncate w-full px-1"
                    style={{ color: item.rarityColor }}
                  >
                    {item.name.split("|")[1]?.trim() ?? item.name}
                  </div>

                  {/* Value */}
                  <div className="text-xs font-mono font-bold text-text mt-1">
                    {formatCredits(item.value)}
                  </div>

                  {/* Rarity bar */}
                  <div
                    className="w-full h-0.5 rounded-full mt-2"
                    style={{ backgroundColor: item.rarityColor }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-secondary">
            Click "Open" to start spinning
          </div>
        )}
      </div>
    </div>
  );
}
