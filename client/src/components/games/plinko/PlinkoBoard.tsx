import { useRef, useEffect, useCallback } from "react";
import { COLORS, PLINKO_MULTIPLIERS, type PlinkoRows, type PlinkoRisk } from "../../../lib/constants";
import type { PlinkoBall } from "../../../lib/gameContext";

interface PlinkoBoardProps {
  rows: PlinkoRows;
  risk: PlinkoRisk;
  balls: PlinkoBall[];
}

interface AnimatedBall {
  id: string;
  path: number[];
  bucket: number;
  multiplier: number;
  currentRow: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number; // 0-1 interpolation between current and next row
  done: boolean;
}

export function PlinkoBoard({ rows, risk, balls }: PlinkoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animBallsRef = useRef<AnimatedBall[]>([]);
  const prevBallIds = useRef<Set<string>>(new Set());
  const animRef = useRef<number>(0);

  const multipliers = PLINKO_MULTIPLIERS[rows][risk];

  // Board layout calculations
  const getLayout = useCallback(
    (w: number, h: number) => {
      const padTop = 30;
      const padBottom = 50;
      const padSide = 40;
      const boardH = h - padTop - padBottom;
      const boardW = w - padSide * 2;
      const rowSpacing = boardH / (rows + 1);
      const pegRadius = Math.max(2, Math.min(4, 300 / rows));
      const ballRadius = Math.max(4, Math.min(7, 400 / rows));

      // Calculate peg positions
      const pegs: { x: number; y: number; row: number; col: number }[] = [];
      for (let r = 0; r < rows; r++) {
        const numPegs = r + 3;
        const pegSpacing = boardW / (numPegs + 1);
        const startX = padSide + pegSpacing;
        for (let c = 0; c < numPegs; c++) {
          pegs.push({
            x: startX + c * pegSpacing,
            y: padTop + (r + 1) * rowSpacing,
            row: r,
            col: c,
          });
        }
      }

      // Bucket positions
      const numBuckets = rows + 1;
      const bucketWidth = boardW / numBuckets;
      const buckets: { x: number; y: number; w: number }[] = [];
      for (let b = 0; b < numBuckets; b++) {
        buckets.push({
          x: padSide + b * bucketWidth,
          y: h - padBottom,
          w: bucketWidth,
        });
      }

      return { padTop, padSide, boardW, rowSpacing, pegRadius, ballRadius, pegs, buckets, numBuckets, bucketWidth };
    },
    [rows],
  );

  // Get ball position at a given row
  const getBallPosition = useCallback(
    (path: number[], row: number, layout: ReturnType<typeof getLayout>) => {
      const { padSide, boardW, padTop, rowSpacing } = layout;
      const numPegs = row + 3;
      const pegSpacing = boardW / (numPegs + 1);

      // Start from center
      let x = padSide + boardW / 2;
      let y = padTop;

      for (let r = 0; r <= row && r < path.length; r++) {
        const currentNumPegs = r + 3;
        const currentSpacing = boardW / (currentNumPegs + 1);
        const halfSpacing = currentSpacing / 2;

        x += path[r] === 1 ? halfSpacing : -halfSpacing;
        y = padTop + (r + 1) * rowSpacing;
      }

      return { x, y };
    },
    [],
  );

  // Track new balls and start their animation
  useEffect(() => {
    const currentIds = new Set(balls.map((b) => b.id));
    const newBalls = balls.filter((b) => !prevBallIds.current.has(b.id) && b.animating);

    newBalls.forEach((ball) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const layout = getLayout(w, h);

      animBallsRef.current.push({
        id: ball.id,
        path: ball.path,
        bucket: ball.bucket,
        multiplier: ball.multiplier,
        currentRow: -1,
        x: layout.padSide + layout.boardW / 2,
        y: layout.padTop,
        targetX: layout.padSide + layout.boardW / 2,
        targetY: layout.padTop,
        progress: 0,
        done: false,
      });
    });

    prevBallIds.current = currentIds;
  }, [balls, getLayout]);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Clear
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, w, h);

      const layout = getLayout(w, h);

      // Draw pegs
      layout.pegs.forEach((peg) => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, layout.pegRadius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.border;
        ctx.fill();
        // Subtle highlight
        ctx.beginPath();
        ctx.arc(peg.x - 1, peg.y - 1, layout.pegRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fill();
      });

      // Draw buckets with multiplier labels
      layout.buckets.forEach((bucket, i) => {
        const mult = multipliers[i];
        const isHighValue = mult >= 5;
        const isMedValue = mult >= 1.5;
        const color = isHighValue ? COLORS.success : isMedValue ? COLORS.primary : COLORS.danger;

        // Bucket background
        ctx.fillStyle = `${color}15`;
        ctx.fillRect(bucket.x + 1, bucket.y, bucket.w - 2, 35);

        // Top border
        ctx.fillStyle = color;
        ctx.fillRect(bucket.x + 1, bucket.y, bucket.w - 2, 2);

        // Multiplier text
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.min(12, layout.bucketWidth / 5)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${mult}x`, bucket.x + bucket.w / 2, bucket.y + 20);
      });

      // Animate balls
      animBallsRef.current.forEach((ball) => {
        if (ball.done) return;

        ball.progress += 0.04;

        if (ball.progress >= 1) {
          ball.progress = 0;
          ball.currentRow++;

          if (ball.currentRow >= rows) {
            ball.done = true;
            // Snap to bucket center
            const bucketX = layout.buckets[ball.bucket].x + layout.buckets[ball.bucket].w / 2;
            ball.x = bucketX;
            ball.y = layout.buckets[ball.bucket].y + 15;
            return;
          }

          // Move to next position
          const pos = getBallPosition(ball.path, ball.currentRow, layout);
          ball.x = ball.targetX;
          ball.y = ball.targetY;
          ball.targetX = pos.x;
          ball.targetY = pos.y;
        }

        // Interpolate position with ease
        const t = ball.progress;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const drawX = ball.x + (ball.targetX - ball.x) * ease;
        const drawY = ball.y + (ball.targetY - ball.y) * ease;

        // Draw ball
        ctx.beginPath();
        ctx.arc(drawX, drawY, layout.ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.primary;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(drawX, drawY, layout.ballRadius + 3, 0, Math.PI * 2);
        ctx.fillStyle = `${COLORS.primary}30`;
        ctx.fill();
      });

      // Draw settled balls
      animBallsRef.current.forEach((ball) => {
        if (!ball.done) return;

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, layout.ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = ball.multiplier >= 2 ? COLORS.success : ball.multiplier >= 1 ? COLORS.primary : COLORS.danger;
        ctx.fill();
      });

      // Clean up old done balls
      if (animBallsRef.current.length > 20) {
        animBallsRef.current = animBallsRef.current.slice(-15);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, [rows, risk, multipliers, getLayout, getBallPosition]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "500px" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
