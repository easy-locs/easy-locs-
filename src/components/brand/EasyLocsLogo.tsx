/**
 * Easy-Locs Premium Brand System
 * 2 variants: full (horizontal wordmark), splash (centered with tagline)
 * No icon-only variant with "EL" text — brand is always the full name.
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

const sizeMap: Record<LogoSize, { full: string; icon: number; splash: string }> = {
  xs: { full: "text-sm", icon: 20, splash: "text-xl" },
  sm: { full: "text-base", icon: 24, splash: "text-2xl" },
  md: { full: "text-xl", icon: 32, splash: "text-4xl" },
  lg: { full: "text-2xl", icon: 40, splash: "text-5xl" },
  xl: { full: "text-3xl", icon: 48, splash: "text-6xl" },
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

/** Compact icon — just the "E" brand letter, no circle with EL */
export function EasyLocsIcon({ size = 32, animate = false }: { size?: number; animate?: boolean }) {
  const fontSize = Math.round(size * 0.55);
  const content = (
    <span
      style={{
        fontSize: `${fontSize}px`,
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
      Easy-Locs
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

/** Full horizontal wordmark */
function FullLogo({ size, animate }: { size: LogoSize; animate: boolean }) {
  const textClass = sizeMap[size].full;

  const content = (
    <div className="flex items-baseline gap-0.5 select-none">
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

/** Splash variant — centered with tagline */
function SplashLogo({ size, animate }: { size: LogoSize; animate: boolean }) {
  const textClass = sizeMap[size].splash;

  const content = (
    <div className="flex flex-col items-center gap-3 select-none">
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
        // Icon variant now shows compact brand text, not a circle
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
