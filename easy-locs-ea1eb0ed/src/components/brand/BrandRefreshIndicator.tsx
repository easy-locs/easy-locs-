import { RadarSvg } from "@/components/brand/EasyLocsLogo";

interface BrandRefreshIndicatorProps {
  spinning?: boolean;
  size?: number;
}

export function BrandRefreshIndicator({ spinning = false, size = 18 }: BrandRefreshIndicatorProps) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={spinning ? { animation: "brand-radar-spin 1.2s linear infinite" } : undefined}
    >
      <RadarSvg
        size={size}
        animate={false}
        gradientColors={["hsl(var(--brand-primary))", "hsl(var(--brand-primary-dark))"]}
      />
    </span>
  );
}

export default BrandRefreshIndicator;
