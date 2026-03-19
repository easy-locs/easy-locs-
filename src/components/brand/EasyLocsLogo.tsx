/**
 * Easy-Locs Premium Brand System
 * 3 variants: full (horizontal wordmark), icon (EL monogram), splash (centered with glow)
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

const fadeGlow: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const slideIn: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const pulseGlow: Variants = {
  idle: { filter: "drop-shadow(0 0 0px transparent)" },
  glow: {
    filter: [
      "drop-shadow(0 0 4px hsl(38 65% 56% / 0.4))",
      "drop-shadow(0 0 12px hsl(38 65% 56% / 0.2))",
      "drop-shadow(0 0 4px hsl(38 65% 56% / 0.4))",
    ],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

/** EL Monogram Icon — geometric, premium */
export function EasyLocsIcon({ size = 32, animate = false }: { size?: number; animate?: boolean }) {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Easy-Locs icon"
    >
      {/* Outer orbit ring */}
      <circle cx="24" cy="24" r="22" stroke="url(#gold-grad)" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* E letter */}
      <path
        d="M14 15h10M14 24h8M14 33h10M14 15v18"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* L letter */}
      <path
        d="M28 15v18h8"
        stroke="url(#gold-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Location pin dot */}
      <circle cx="36" cy="14" r="2.5" fill="url(#gold-grad)" />
      <defs>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="hsl(45, 90%, 55%)" />
          <stop offset="1" stopColor="hsl(35, 85%, 45%)" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (animate) {
    return (
      <motion.div variants={pulseGlow} initial="idle" animate="glow">
        {icon}
      </motion.div>
    );
  }

  return icon;
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

/** Splash variant — centered with glow reveal */
function SplashLogo({ size, animate }: { size: LogoSize; animate: boolean }) {
  const textClass = sizeMap[size].splash;

  const content = (
    <div className="flex flex-col items-center gap-4 select-none">
      <EasyLocsIcon size={56} animate={animate} />
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
