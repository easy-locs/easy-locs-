/**
 * Sparkline — ACP Agent 5 (#864). Tiny inline-SVG line chart used in
 * the Mission Control overview to render run/min, latency, cost and
 * error trends without pulling in a chart library.
 */
interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  ariaLabel?: string;
}

export default function Sparkline({
  values,
  width = 160,
  height = 36,
  stroke = "currentColor",
  fill = "none",
  ariaLabel,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel ?? "no data"}
        className="text-muted-foreground/40"
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeDasharray="2 3"
          strokeWidth={1}
        />
      </svg>
    );
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(" L ")}`;
  const area = `${path} L ${(width).toFixed(1)},${height} L 0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel ?? "trend"}
      className="block"
    >
      {fill !== "none" && (
        <path d={area} fill={fill} opacity={0.15} />
      )}
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
