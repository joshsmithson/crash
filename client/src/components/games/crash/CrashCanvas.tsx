import { useRef, useEffect, useCallback } from "react";
import { COLORS } from "../../../lib/constants";
import type { CrashPhase } from "../../../lib/gameContext";

interface CrashCanvasProps {
  phase: CrashPhase;
  currentMultiplier: number;
  crashPoint: number | null;
  countdown: number;
}

export function CrashCanvas({
  phase,
  currentMultiplier,
  crashPoint,
  countdown,
}: CrashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Responsive canvas sizing
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
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, maxMult: number) => {
      const padding = { top: 40, right: 20, bottom: 40, left: 60 };
      const graphW = w - padding.left - padding.right;
      const graphH = h - padding.top - padding.bottom;

      // Grid lines
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Horizontal grid lines (multiplier values)
      const multStep = maxMult <= 2 ? 0.25 : maxMult <= 5 ? 0.5 : maxMult <= 20 ? 2 : 10;
      for (let m = 1; m <= maxMult; m += multStep) {
        const y = padding.top + graphH - ((m - 1) / (maxMult - 1)) * graphH;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + graphW, y);
        ctx.stroke();

        // Label
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${m.toFixed(2)}x`, padding.left - 8, y + 4);
      }

      ctx.setLineDash([]);
      return { padding, graphW, graphH };
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    if (phase === "waiting") {
      // Waiting state: show countdown
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 48px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${countdown}s`, w / 2, h / 2 - 20);

      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "16px 'Inter', sans-serif";
      ctx.fillText("Starting soon...", w / 2, h / 2 + 25);

      // Pulsing circle
      const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 80, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 212, 255, ${pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
      return;
    }

    // Running or crashed
    const maxMult = Math.max(currentMultiplier * 1.3, 2);
    const { padding, graphW, graphH } = drawGrid(ctx, w, h, maxMult);

    // Draw curve
    const elapsed = phase === "crashed" ? 1 : 1; // Normalized
    const points: [number, number][] = [];
    const totalSteps = 200;

    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const mult = Math.pow(Math.E, 0.07 * t * (Date.now() - startTimeRef.current) / 1000 * totalSteps / totalSteps);
      if (mult > currentMultiplier) break;

      const x = padding.left + (t * graphW);
      const y = padding.top + graphH - ((Math.min(mult, currentMultiplier) - 1) / (maxMult - 1)) * graphH;
      points.push([x, y]);
    }

    // Simpler approach: draw from 1x to current multiplier
    const steps = Math.min(300, Math.floor(currentMultiplier * 50));
    const curvePoints: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const mult = 1 + (currentMultiplier - 1) * frac;
      const x = padding.left + frac * graphW;
      const y = padding.top + graphH - ((mult - 1) / (maxMult - 1)) * graphH;
      curvePoints.push([x, y]);
    }

    if (curvePoints.length > 1) {
      // Gradient fill under curve
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphH);
      if (phase === "crashed") {
        gradient.addColorStop(0, "rgba(255, 71, 87, 0.15)");
        gradient.addColorStop(1, "rgba(255, 71, 87, 0)");
      } else {
        gradient.addColorStop(0, "rgba(0, 212, 255, 0.15)");
        gradient.addColorStop(1, "rgba(0, 212, 255, 0)");
      }

      ctx.beginPath();
      ctx.moveTo(curvePoints[0][0], padding.top + graphH);
      curvePoints.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(curvePoints[curvePoints.length - 1][0], padding.top + graphH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Curve line
      ctx.beginPath();
      curvePoints.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = phase === "crashed" ? COLORS.danger : COLORS.primary;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Glow effect on line
      ctx.shadowColor = phase === "crashed" ? COLORS.danger : COLORS.primary;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dot at end of line
      const [endX, endY] = curvePoints[curvePoints.length - 1];
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fillStyle = phase === "crashed" ? COLORS.danger : COLORS.primary;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(endX, endY, 8, 0, Math.PI * 2);
      ctx.strokeStyle = phase === "crashed" ? COLORS.danger : COLORS.primary;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Central multiplier text
    const multText = `${currentMultiplier.toFixed(2)}x`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (phase === "crashed") {
      ctx.fillStyle = COLORS.danger;
      ctx.font = "bold 56px 'JetBrains Mono', monospace";
      ctx.shadowColor = COLORS.danger;
      ctx.shadowBlur = 20;
      ctx.fillText(multText, w / 2, h / 2 - 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = COLORS.danger;
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillText("CRASHED!", w / 2, h / 2 + 30);
    } else {
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 56px 'JetBrains Mono', monospace";
      ctx.shadowColor = COLORS.primary;
      ctx.shadowBlur = 15;
      ctx.fillText(multText, w / 2, h / 2 - 10);
      ctx.shadowBlur = 0;
    }

    // Continue animation if running
    if (phase === "running") {
      animRef.current = requestAnimationFrame(draw);
    }
  }, [phase, currentMultiplier, crashPoint, countdown, drawGrid]);

  useEffect(() => {
    if (phase === "running") {
      startTimeRef.current = Date.now();
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, currentMultiplier, countdown, draw]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "400px" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-xl" />
    </div>
  );
}
