import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

type Period = "1D" | "1W" | "1M" | "3M" | "1Y";

interface DataPoint {
  time: number;
  value: number;
}

interface ForexChartProps {
  baseCurrency: string;
  quoteCurrency: string;
  currentRate: number;
  historicalData?: DataPoint[];
  className?: string;
}

const PERIODS: Period[] = ["1D", "1W", "1M", "3M", "1Y"];

function buildSyntheticHistory(rate: number, period: Period): DataPoint[] {
  const now = Date.now();
  const points: DataPoint[] = [];
  let count: number;
  let interval: number;

  switch (period) {
    case "1D": count = 24; interval = 3_600_000; break;
    case "1W": count = 7; interval = 86_400_000; break;
    case "1M": count = 30; interval = 86_400_000; break;
    case "3M": count = 90; interval = 86_400_000; break;
    case "1Y": count = 52; interval = 604_800_000; break;
  }

  let val = rate * (0.95 + Math.random() * 0.05);
  for (let i = count; i >= 0; i--) {
    val += (Math.random() - 0.48) * rate * 0.005;
    val = Math.max(rate * 0.85, Math.min(rate * 1.15, val));
    points.push({ time: now - i * interval, value: val });
  }
  points[points.length - 1].value = rate;
  return points;
}

function ForexChartInner({
  baseCurrency,
  quoteCurrency,
  currentRate,
  historicalData,
  className = "",
}: ForexChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activePeriod, setActivePeriod] = useState<Period>("1M");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    if (historicalData && historicalData.length > 0) return historicalData;
    return buildSyntheticHistory(currentRate, activePeriod);
  }, [currentRate, activePeriod, historicalData]);

  const { minVal, maxVal, change, changePercent } = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = values[0] ?? currentRate;
    const last = values[values.length - 1] ?? currentRate;
    return {
      minVal: min,
      maxVal: max,
      change: last - first,
      changePercent: ((last - first) / first) * 100,
    };
  }, [data, currentRate]);

  const isPositive = change >= 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 8, bottom: 8, left: 0, right: 0 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const range = maxVal - minVal || 1;

    const lineColor = isPositive ? "#10b981" : "#ef4444";
    const fillColor = isPositive ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";

    ctx.beginPath();
    data.forEach((pt, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW;
      const y = padding.top + (1 - (pt.value - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    if (hoverIndex !== null && hoverIndex < data.length) {
      const x = padding.left + (hoverIndex / (data.length - 1)) * chartW;
      const y = padding.top + (1 - (data[hoverIndex].value - minVal) / range) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.strokeStyle = "rgba(128,128,128,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [data, minVal, maxVal, isPositive, hoverIndex]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = Math.round((x / rect.width) * (data.length - 1));
      setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
    },
    [data.length],
  );

  const displayValue = hoverIndex !== null ? data[hoverIndex]?.value ?? currentRate : currentRate;

  return (
    <div className={`rounded-2xl border border-border/10 bg-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {baseCurrency}/{quoteCurrency}
          </h3>
          <p className="text-xl font-bold tracking-tight text-foreground">
            {displayValue.toFixed(4)}
          </p>
        </div>
        <div className={`text-right ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
          <p className="text-sm font-semibold">
            {isPositive ? "+" : ""}{change.toFixed(4)}
          </p>
          <p className="text-xs">
            {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-32 cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      />

      <div className="flex gap-1 mt-3">
        {PERIODS.map((period) => (
          <motion.button
            key={period}
            onClick={() => { setActivePeriod(period); setHoverIndex(null); }}
            className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${
              activePeriod === period
                ? "bg-[hsl(var(--brand-primary))] text-white"
                : "bg-muted/50 text-foreground/50 hover:bg-muted"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {period}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

const ForexChart = memo(ForexChartInner);
export default ForexChart;
