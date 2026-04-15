import { useMemo, useId } from "react";
import { motion, type Variants } from "framer-motion";
import type { LogoSection, SpecialEvent } from "@/hooks/useDynamicLogo";

export type LogoVariant = "full" | "icon" | "splash";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface DynamicLogoProps {
  gradientColors?: [string, string];
  microIcon?: LogoSection;
  specialEvent?: SpecialEvent;
}

interface EasyLocsLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  animate?: boolean;
  className?: string;
  onClick?: () => void;
  dynamic?: DynamicLogoProps;
}

const sizeMap: Record<LogoSize, { full: string; icon: number; splash: string; radarSize: number }> = {
  xs: { full: "text-sm", icon: 20, splash: "text-xl", radarSize: 18 },
  sm: { full: "text-base", icon: 24, splash: "text-2xl", radarSize: 22 },
  md: { full: "text-xl", icon: 32, splash: "text-4xl", radarSize: 34 },
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

const DEFAULT_GRADIENT: [string, string] = ["hsl(168 72% 44%)", "hsl(168 78% 32%)"];

function withAlpha(color: string, alpha: number): string {
  const hslMatch = color.match(/^hsl\(([^)]+)\)$/);
  if (hslMatch) {
    return `hsl(${hslMatch[1]} / ${alpha})`;
  }
  return color;
}

function getMicroIconPath(section: LogoSection): string | null {
  switch (section) {
    case "food":
      return "M7 3C7 2.45 7.45 2 8 2s1 .45 1 1v5h1V3c0-.55.45-1 1-1s1 .45 1 1v5h1V3c0-.55.45-1 1-1s1 .45 1 1v6c0 1.1-.9 2-2 2v9c0 .55-.45 1-1 1s-1-.45-1-1v-9H9c-1.1 0-2-.9-2-2V3zm-3 1c0-.55.45-1 1-1s1 .45 1 1v7h1v9c0 .55-.45 1-1 1s-1-.45-1-1v-6H4V4z";
    case "taxi":
      return "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1-.45 1-1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z";
    case "hotel":
      return "M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z";
    case "commerce":
      return "M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.17 15l.03-.12.9-1.64h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0020 4.62H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.17z";
    case "services":
      return "M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z";
    case "travel":
      return "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";
    case "immo":
      return "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z";
    case "orbit":
      return "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z";
    default:
      return null;
  }
}

function MicroIcon({ section, size, color }: { section: LogoSection; size: number; color: string }) {
  const path = getMicroIconPath(section);
  if (!path) return null;

  const iconSize = size * 0.45;
  const offset = (size - iconSize) / 2;

  return (
    <g style={{ transition: "opacity 0.5s ease" }} opacity={0.85}>
      <g transform={`translate(${offset}, ${offset}) scale(${iconSize / 24})`}>
        <path d={path} fill={color} style={{ transition: "fill 0.8s ease, d 0.5s ease" }} />
      </g>
    </g>
  );
}

function EventParticles({ event, size }: { event: SpecialEvent; size: number }) {
  if (!event) return null;

  const half = size / 2;
  const particleR = half * 1.2;

  const particles = useMemo(() => {
    switch (event) {
      case "new_year":
        return Array.from({ length: 6 }, (_, i) => {
          const angle = (i * 60 * Math.PI) / 180;
          const r = particleR * (0.8 + Math.random() * 0.4);
          return {
            cx: half + Math.cos(angle) * r,
            cy: half + Math.sin(angle) * r,
            color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"][i],
            size: 1.5 + Math.random(),
          };
        });
      case "christmas":
        return Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 72 * Math.PI) / 180 - Math.PI / 2;
          const r = particleR * (0.7 + Math.random() * 0.5);
          return {
            cx: half + Math.cos(angle) * r,
            cy: half + Math.sin(angle) * r,
            color: "#E8F4FD",
            size: 1.2 + Math.random() * 0.8,
          };
        });
      case "valentine":
        return Array.from({ length: 4 }, (_, i) => {
          const angle = (i * 90 * Math.PI) / 180 + Math.PI / 4;
          const r = particleR * (0.8 + Math.random() * 0.3);
          return {
            cx: half + Math.cos(angle) * r,
            cy: half + Math.sin(angle) * r,
            color: ["#FF6B8A", "#FF4D6D", "#FF85A1", "#FFB3C1"][i],
            size: 1.5,
          };
        });
      case "ramadan":
        return Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 72 * Math.PI) / 180 - Math.PI / 2;
          const r = particleR * (0.7 + Math.random() * 0.4);
          return {
            cx: half + Math.cos(angle) * r,
            cy: half + Math.sin(angle) * r,
            color: ["#FFD700", "#FFF8DC", "#FFE4B5", "#FAFAD2", "#FFD700"][i],
            size: 1 + Math.random() * 0.5,
          };
        });
      default:
        return [];
    }
  }, [event, half, particleR]);

  return (
    <>
      {particles.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.size} fill={p.color} opacity={0.7}>
          <animate
            attributeName="opacity"
            values="0.7;0.2;0.7"
            dur={`${2 + i * 0.3}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values={`${p.size};${p.size * 1.4};${p.size}`}
            dur={`${2.5 + i * 0.2}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </>
  );
}

interface RadarSvgProps {
  size?: number;
  animate?: boolean;
  gradientColors?: [string, string];
  microIcon?: LogoSection;
  specialEvent?: SpecialEvent;
}

function RadarSvg({
  size = 30,
  animate = false,
  gradientColors = DEFAULT_GRADIENT,
  microIcon = "default",
  specialEvent = null,
}: RadarSvgProps) {
  const uid = useId().replace(/:/g, "_");
  const half = size / 2;
  const r1 = half * 0.35;
  const r2 = half * 0.6;
  const r3 = half * 0.85;
  const dot = half * 0.1;
  const hasMicroIcon = microIcon !== "default" && getMicroIconPath(microIcon) !== null;
  const svgSize = specialEvent ? size * 1.5 : size;
  const svgOffset = specialEvent ? (svgSize - size) / 2 : 0;

  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`${-svgOffset} ${-svgOffset} ${svgSize} ${svgSize}`}
        fill="none"
        className="block"
        style={{ overflow: "visible", margin: specialEvent ? `${-svgOffset}px` : undefined }}
      >
        {[r1, r2, r3].map((r, i) => (
          <circle
            key={i}
            cx={half}
            cy={half}
            r={r}
            stroke={gradientColors[0]}
            strokeWidth={0.8}
            strokeOpacity={0.35 - i * 0.08}
            fill="none"
            style={{ transition: "stroke 0.8s ease" }}
          >
            {animate && (
              <animate
                attributeName="stroke-opacity"
                values={`${0.35 - i * 0.08};${0.5 - i * 0.08};${0.35 - i * 0.08}`}
                dur={`${3 + i}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        ))}
        <path
          d={`M ${half} ${half} L ${half + r3} ${half} A ${r3} ${r3} 0 0 1 ${half + r3 * Math.cos(Math.PI / 4)} ${half - r3 * Math.sin(Math.PI / 4)} Z`}
          fill={`url(#sweep-grad-${uid})`}
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
        {hasMicroIcon ? (
          <MicroIcon section={microIcon} size={size} color={gradientColors[0]} />
        ) : (
          <circle cx={half} cy={half} r={dot} fill={gradientColors[0]} style={{ transition: "fill 0.8s ease" }} />
        )}
        {specialEvent && <EventParticles event={specialEvent} size={size} />}
        <defs>
          <radialGradient id={`sweep-grad-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={gradientColors[0]} stopOpacity="0.5" />
            <stop offset="100%" stopColor={gradientColors[1]} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      {animate && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: `1px solid ${withAlpha(gradientColors[0], 0.2)}`, transition: "border-color 0.8s ease" }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </span>
  );
}

export function EasyLocsIcon({
  size = 32,
  animate = false,
  dynamic,
}: {
  size?: number;
  animate?: boolean;
  dynamic?: DynamicLogoProps;
}) {
  const colors = dynamic?.gradientColors ?? DEFAULT_GRADIENT;
  const content = (
    <span className="inline-flex items-center gap-1">
      <RadarSvg
        size={Math.round(size * 0.7)}
        animate={animate}
        gradientColors={colors}
        microIcon={dynamic?.microIcon}
        specialEvent={dynamic?.specialEvent}
      />
      <span
        style={{
          fontSize: `${Math.round(size * 0.4)}px`,
          fontWeight: 800,
          letterSpacing: "-0.5px",
          lineHeight: 1,
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          transition: "background 0.8s ease",
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

function FullLogo({
  size,
  animate,
  dynamic,
}: {
  size: LogoSize;
  animate: boolean;
  dynamic?: DynamicLogoProps;
}) {
  const textClass = sizeMap[size].full;
  const radarSize = sizeMap[size].radarSize;
  const colors = dynamic?.gradientColors ?? DEFAULT_GRADIENT;

  const content = (
    <div className="flex items-center gap-1.5 select-none">
      <RadarSvg
        size={radarSize}
        animate={animate}
        gradientColors={colors}
        microIcon={dynamic?.microIcon}
        specialEvent={dynamic?.specialEvent}
      />
      <div className="flex items-baseline gap-0.5">
        <span className={`${textClass} font-black tracking-tight text-foreground dark:text-white`}>
          Easy
        </span>
        <span
          className={`${textClass} font-black tracking-tight`}
          style={{
            background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            transition: "background 0.8s ease",
          }}
        >
          -Locs
        </span>
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

function SplashLogo({
  size,
  animate,
  dynamic,
}: {
  size: LogoSize;
  animate: boolean;
  dynamic?: DynamicLogoProps;
}) {
  const textClass = sizeMap[size].splash;
  const radarSize = sizeMap[size].radarSize * 2.2;
  const colors = dynamic?.gradientColors ?? DEFAULT_GRADIENT;

  const content = (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="relative">
        <RadarSvg
          size={radarSize}
          animate={animate}
          gradientColors={colors}
          microIcon={dynamic?.microIcon}
          specialEvent={dynamic?.specialEvent}
        />
        {animate && (
          <>
            <motion.div
              className="absolute inset-[-30%] rounded-full"
              style={{ border: `1px solid ${withAlpha(colors[0], 0.12)}` }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-[-60%] rounded-full"
              style={{ border: `1px solid ${withAlpha(colors[0], 0.06)}` }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            />
          </>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`${textClass} font-black tracking-tight text-[#1a2332] dark:text-white`}>
          Easy
        </span>
        <span
          className={`${textClass} font-black tracking-tight`}
          style={{
            background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            transition: "background 0.8s ease",
          }}
        >
          -Locs
        </span>
      </div>
      <span
        className="text-[10px] tracking-[0.35em] uppercase font-medium"
        style={{ color: withAlpha(colors[0], 0.7), transition: "color 0.8s ease" }}
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
  dynamic,
}: EasyLocsLogoProps) {
  const inner = (() => {
    switch (variant) {
      case "icon":
        return <EasyLocsIcon size={sizeMap[size].icon} animate={animate} dynamic={dynamic} />;
      case "splash":
        return <SplashLogo size={size} animate={animate} dynamic={dynamic} />;
      default:
        return <FullLogo size={size} animate={animate} dynamic={dynamic} />;
    }
  })();

  return (
    <div className={`inline-flex items-center ${className}`} onClick={onClick} role={onClick ? "button" : undefined}>
      {inner}
    </div>
  );
}

export { RadarSvg };
export type { RadarSvgProps };
