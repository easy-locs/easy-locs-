/**
 * Easy-Locs Premium Brand System — with integrated radar pulse.
 * 3 variants: full (horizontal wordmark + mini radar), splash (centered with radar rings), icon (compact)
 */
import { motion, type Variants } from "framer-motion";

export type LogoVariant = "full" | "icon" | "splash";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface EasyLocsLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeMap: Record<LogoSize, { full: string; icon: number; splash: string; radarSize: number }> = {
  xs: { full: "text-sm", icon: 20, splash: "text-xl", radarSize: 18 },
  sm: { full: "text-base", icon: 24, splash: "text-2xl", radarSize: 22 },
  md: { full: "text-xl", icon: 32, splash: "text-4xl", radarSize: 30 },
  lg: { full: "text-2xl", icon: 40, splash: "text-5xl", radarSize: 38 },
  xl: { full: "text-3xl", icon: 48, splash: "text-6xl", radarSize: 46 },
};

const slideIn: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const fadeGlow: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

/** SVG Radar Icon — concentric arcs + sweep + center dot */
function RadarSvg({ size = 30, animate = false }: { size?: number; animate?: boolean }) {
  const half = size / 2;
  const r1 = half * 0.35;
  const r2 = half * 0.6;
  const r3 = half * 0.85;
  const dot = half * 0.1;

  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className="block">
        {/* Rings */}
        {[r1, r2, r3].map((r, i) => (
          <circle
            key={i}
            cx={half}
            cy={half}
            r={r}
            stroke="hsl(45 90% 55%)"
            strokeWidth={0.8}
            strokeOpacity={0.35 - i * 0.08}
            fill="none"
          />
        ))}
        {/* Sweep arc */}
        <path
          d={`M ${half} ${half} L ${half + r3} ${half} A ${r3} ${r3} 0 0 1 ${half + r3 * Math.cos(Math.PI / 4)} ${half - r3 * Math.sin(Math.PI / 4)} Z`}
          fill="url(#sweep-grad)"
          opacity={0.5}
        >
          {animate && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${half} ${half}`}
              to={`360 ${half} ${half}`}
              dur="4s"
              repeatCount="indefinite"
            />
          )}
        </path>
        {/* Center dot */}
        <circle cx={half} cy={half} r={dot} fill="hsl(45 90% 55%)" />
        <defs>
          <radialGradient id="sweep-grad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="hsl(45 90% 55%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(45 90% 55%)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      {/* Outer pulse ring */}
      {animate && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: "1px solid hsl(45 90% 55% / 0.3)" }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </span>
  );
}

/** Compact icon — radar + brand text */
export function EasyLocsIcon({ size = 32, animate = false }: { size?: number; animate?: boolean }) {
  const content = (
    <span className="inline-flex items-center gap-1">
      <RadarSvg size={Math.round(size * 0.7)} animate={animate} />
      <span
        style={{
          fontSize: `${Math.round(size * 0.4)}px`,
          fontWeight: 800,
          letterSpacing: "-0.5px",
          lineHeight: 1,
          background: "linear-gradient(135deg, hsl(45 90% 55%), hsl(35 85% 45%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
        aria-label="Easy-Locs"
      >
        EL
      </span>
    </span>
  );

  if (animate) {
    return (
      <motion.div variants={slideIn} initial="hidden" animate="visible">
        {content}
      </motion.div>
    );
  }
  return content;
}

/** Full horizontal wordmark with radar icon */
function FullLogo({ size, animate }: { size: LogoSize; animate: boolean }) {
  const textClass = sizeMap[size].full;
  const radarSize = sizeMap[size].radarSize;

  const content = (
    <div className="flex items-center gap-1.5 select-none">
      <RadarSvg size={radarSize} animate={animate} />
      <div className="flex items-baseline gap-0.5">
        <span className={`${textClass} font-black tracking-tight text-white`}>
          Easy
        </span>
        <span
          className={`${textClass} font-black tracking-tight`}
          style={{
            background: "linear-gradient(135deg, hsl(45 90% 55%), hsl(35 85% 45%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          -Locs
        </span>
        <span className="text-[7px] font-bold align-super ml-0.5" style={{ color: "hsl(38 65% 56%)" }}>®</span>
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div variants={slideIn} initial="hidden" animate="visible">
        {content}
      </motion.div>
    );
  }
  return content;
}

/** Splash variant — centered with radar rings + tagline */
function SplashLogo({ size, animate }: { size: LogoSize; animate: boolean }) {
  const textClass = sizeMap[size].splash;
  const radarSize = sizeMap[size].radarSize * 2.2;

  const content = (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Radar emblem */}
      <div className="relative">
        <RadarSvg size={radarSize} animate={animate} />
        {animate && (
          <>
            <motion.div
              className="absolute inset-[-30%] rounded-full"
              style={{ border: "1px solid hsl(45 90% 55% / 0.12)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-[-60%] rounded-full"
              style={{ border: "1px solid hsl(45 90% 55% / 0.06)" }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            />
          </>
        )}
      </div>

      {/* Wordmark */}
      <div className="flex items-baseline gap-1">
        <span className={`${textClass} font-black tracking-tight text-white`}>
          Easy
        </span>
        <span
          className={`${textClass} font-black tracking-tight`}
          style={{
            background: "linear-gradient(135deg, hsl(45 90% 55%), hsl(35 85% 45%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          -Locs
        </span>
        <span className="text-[9px] font-bold align-super ml-0.5" style={{ color: "hsl(38 65% 56%)" }}>®</span>
      </div>
      <span
        className="text-[10px] tracking-[0.35em] uppercase font-medium"
        style={{ color: "hsl(38 65% 56% / 0.7)" }}
      >
        Connect • Locate • Grow
      </span>
    </div>
  );

  if (animate) {
    return (
      <motion.div variants={fadeGlow} initial="hidden" animate="visible">
        {content}
      </motion.div>
    );
  }
  return content;
}

export default function EasyLocsLogo({
  variant = "full",
  size = "md",
  animate = false,
  className = "",
  onClick,
}: EasyLocsLogoProps) {
  const inner = (() => {
    switch (variant) {
      case "icon":
        return <EasyLocsIcon size={sizeMap[size].icon} animate={animate} />;
      case "splash":
        return <SplashLogo size={size} animate={animate} />;
      default:
        return <FullLogo size={size} animate={animate} />;
    }
  })();

  return (
    <div className={`inline-flex items-center ${className}`} onClick={onClick} role={onClick ? "button" : undefined}>
      {inner}
    </div>
  );
}
