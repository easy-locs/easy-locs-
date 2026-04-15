import React, { useState, useEffect, useCallback, useId, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTimeOfDay, getSpecialEvent, TIME_GRADIENTS } from "@/hooks/useDynamicLogo";
import type { SpecialEvent } from "@/hooks/useDynamicLogo";

const SPLASH_DURATION = 3200;
const RADAR_SIZE = 150;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 768 ||
    ("matchMedia" in window && window.matchMedia("(prefers-reduced-motion: reduce)").matches));

function getSplashContext() {
  const now = new Date();
  const timeOfDay = getTimeOfDay(now.getHours());
  const specialEvent = getSpecialEvent(now);
  const gradientColors = TIME_GRADIENTS[timeOfDay];
  return { gradientColors, specialEvent, timeOfDay };
}

function SplashEventMotif({ event }: { event: SpecialEvent }) {
  if (!event) return null;

  const motifs: Record<string, { emoji: string; count: number }> = {
    new_year: { emoji: "\u{1F389}", count: 6 },
    christmas: { emoji: "\u2744", count: 5 },
    valentine: { emoji: "\u2665", count: 4 },
    ramadan: { emoji: "\u262A", count: 5 },
  };

  const config = motifs[event];
  if (!config) return null;

  return (
    <>
      {Array.from({ length: config.count }, (_, i) => {
        const angle = (i * (360 / config.count) * Math.PI) / 180;
        const radius = 140 + (i % 2) * 30;
        return (
          <motion.span
            key={i}
            className="absolute text-lg pointer-events-none select-none"
            style={{
              left: `calc(50% + ${Math.cos(angle) * radius}px)`,
              top: `calc(50% + ${Math.sin(angle) * radius}px)`,
              transform: "translate(-50%, -50%)",
              opacity: 0,
            }}
            animate={{ opacity: [0, 0.6, 0.3], scale: [0.5, 1.2, 1] }}
            transition={{ delay: 1.2 + i * 0.1, duration: 1, ease: "easeOut" }}
          >
            {config.emoji}
          </motion.span>
        );
      })}
    </>
  );
}

const BLIP_COUNT = 6;
const BLIP_SEED = Date.now();
const blipRng = seededRandom(BLIP_SEED);
const BLIP_POSITIONS = Array.from({ length: BLIP_COUNT }, () => ({
  ring: Math.floor(blipRng() * 4),
  angle: Math.floor(blipRng() * 360),
}));

const RadarBlips = memo(function RadarBlips({
  radii,
  half,
  color,
}: {
  radii: number[];
  half: number;
  color: string;
}) {
  return (
    <>
      {BLIP_POSITIONS.map((blip, i) => {
        const r = radii[blip.ring];
        const a = (blip.angle * Math.PI) / 180;
        const cx = half + Math.cos(a) * r;
        const cy = half + Math.sin(a) * r;
        return (
          <motion.circle
            key={`blip-${i}`}
            cx={cx}
            cy={cy}
            r={2}
            fill={color}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.9, 0.9, 0],
              scale: [0, 1.2, 1, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: 0.8 + i * 0.7,
              ease: "easeInOut",
              times: [0, 0.15, 0.7, 1],
            }}
            style={{ willChange: "transform, opacity" }}
          />
        );
      })}
    </>
  );
});

const SplashRadar = memo(function SplashRadar({
  size,
  accentColor,
  isExiting,
}: {
  size: number;
  accentColor: string;
  isExiting: boolean;
}) {
  const uid = useId().replace(/:/g, "_");
  const half = size / 2;
  const radii = [half * 0.2, half * 0.4, half * 0.6, half * 0.8, half * 0.95];

  const glowId = `splash-glow-${uid}`;

  return (
    <div className="relative" style={{ width: size, height: size, willChange: "transform" }}>
      <div
        className="absolute inset-[-30%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${accentColor.replace(/\)$/, " / 0.15)")} 0%, transparent 70%)`,
          filter: "blur(20px)",
          willChange: "transform, opacity",
          animation: "splashGlowPulse 3s ease-in-out infinite",
        }}
      />

      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${accentColor.replace(/\)$/, " / 0)")} 0deg, ${accentColor.replace(/\)$/, " / 0.35)")} 30deg, ${accentColor.replace(/\)$/, " / 0.08)")} 60deg, ${accentColor.replace(/\)$/, " / 0)")} 90deg, transparent 90deg)`,
          willChange: "transform",
          animation: isExiting
            ? "splashSweepSpin 0.4s linear infinite"
            : "splashSweepSpin 2.5s linear infinite",
          mask: `radial-gradient(circle at center, transparent ${half * 0.15}px, black ${half * 0.18}px)`,
          WebkitMask: `radial-gradient(circle at center, transparent ${half * 0.15}px, black ${half * 0.18}px)`,
        }}
      />

      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, transparent 340deg, ${accentColor.replace(/\)$/, " / 0.12)")} 350deg, transparent 360deg)`,
          willChange: "transform",
          animation: isExiting
            ? "splashSweepSpin 0.4s linear infinite"
            : "splashSweepSpin 2.5s linear infinite",
          mask: `radial-gradient(circle at center, transparent ${half * 0.15}px, black ${half * 0.18}px)`,
          WebkitMask: `radial-gradient(circle at center, transparent ${half * 0.15}px, black ${half * 0.18}px)`,
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        className="relative z-10"
        style={{ willChange: "transform" }}
      >
        {radii.map((r, i) => {
          const circumference = 2 * Math.PI * r;
          return (
            <motion.circle
              key={i}
              cx={half}
              cy={half}
              r={r}
              stroke={accentColor}
              strokeWidth={i === radii.length - 1 ? 0.5 : 0.8}
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference, opacity: 0 }}
              animate={{
                strokeDashoffset: 0,
                opacity: 0.12 + (radii.length - i) * 0.06,
              }}
              transition={{
                strokeDashoffset: {
                  duration: 0.5,
                  delay: 0.3 + i * 0.1,
                  ease: [0.4, 0, 0.2, 1],
                },
                opacity: {
                  duration: 0.4,
                  delay: 0.3 + i * 0.1,
                  ease: "easeOut",
                },
              }}
              style={{ willChange: "stroke-dashoffset, opacity" }}
            />
          );
        })}

        <line
          x1={half}
          y1={half - radii[4]}
          x2={half}
          y2={half + radii[4]}
          stroke={accentColor}
          strokeWidth={0.3}
          opacity={0.1}
        />
        <line
          x1={half - radii[4]}
          y1={half}
          x2={half + radii[4]}
          y2={half}
          stroke={accentColor}
          strokeWidth={0.3}
          opacity={0.1}
        />

        <RadarBlips radii={radii} half={half} color={accentColor} />

        <motion.circle
          cx={half}
          cy={half}
          r={half * 0.12}
          fill={`url(#${glowId})`}
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{
            scale: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          style={{ willChange: "transform" }}
        />
        <motion.circle
          cx={half}
          cy={half}
          r={half * 0.05}
          fill={accentColor}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3, ease: "backOut" }}
        />

        <motion.circle
          cx={half}
          cy={half}
          r={half * 0.2}
          stroke={accentColor}
          strokeWidth={0.5}
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform, opacity" }}
        />

        {[1.15, 1.35].map((factor, i) => (
          <motion.circle
            key={`scan-${i}`}
            cx={half}
            cy={half}
            r={radii[4] * factor}
            stroke={accentColor}
            strokeWidth={0.4}
            fill="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0], scale: [0.95, 1.05, 0.95] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              delay: 1 + i * 0.8,
              ease: "easeInOut",
            }}
            style={{ willChange: "transform, opacity" }}
          />
        ))}

        <defs>
          <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.9" />
            <stop offset="50%" stopColor={accentColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
});

const PARTICLE_COUNT = IS_MOBILE ? 10 : 18;
const PARTICLE_CONFIGS = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  left: `${5 + Math.random() * 90}%`,
  top: `${5 + Math.random() * 90}%`,
  size: 1.5 + Math.random() * 2.5,
  duration: 4 + Math.random() * 6,
  delay: Math.random() * 3,
  dx: -15 + Math.random() * 30,
  dy: -15 + Math.random() * 30,
}));

const BackgroundParticles = memo(function BackgroundParticles({
  color,
  isExiting,
}: {
  color: string;
  isExiting: boolean;
}) {
  return (
    <>
      {PARTICLE_CONFIGS.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: color,
            willChange: "transform, opacity",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={
            isExiting
              ? {
                  opacity: 0,
                  scale: 3,
                  x: p.dx * 5,
                  y: p.dy * 5,
                }
              : {
                  opacity: [0, 0.4, 0.2, 0.4, 0],
                  x: [0, p.dx, p.dx * 0.5, p.dx * 0.8, 0],
                  y: [0, p.dy, p.dy * 0.5, p.dy * 0.8, 0],
                  scale: [0.5, 1, 0.8, 1, 0.5],
                }
          }
          transition={
            isExiting
              ? { duration: 0.6, ease: "easeOut" }
              : {
                  duration: p.duration,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </>
  );
});

const TaglineWord = memo(function TaglineWord({
  word,
  index,
  color,
}: {
  word: string;
  index: number;
  color: string;
}) {
  return (
    <motion.span
      style={{ color }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 1.0 + index * 0.15,
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {word}
    </motion.span>
  );
});

const PremiumProgressBar = memo(function PremiumProgressBar({
  progress,
  color1,
  color2,
}: {
  progress: number;
  color1: string;
  color2: string;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.span
        className="text-[9px] font-medium tracking-widest tabular-nums"
        style={{ color: color1.replace(/\)$/, " / 0.5)") }}
        animate={{ opacity: progress >= 100 ? 0 : 1 }}
      >
        {Math.round(progress)}%
      </motion.span>

      <div
        className="w-[140px] h-[4px] rounded-full overflow-hidden relative"
        style={{
          background: color1.replace(/\)$/, " / 0.08)"),
        }}
      >
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${color1}, ${color2})`,
            willChange: "transform",
            transformOrigin: "left",
            boxShadow: `0 0 8px ${color1.replace(/\)$/, " / 0.4)")}, 0 0 16px ${color1.replace(/\)$/, " / 0.2)")}`,
          }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
              animation: "splashShimmer 1.5s ease-in-out infinite",
              willChange: "transform",
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
});

function useBootProgress() {
  const [progress, setProgress] = useState(20);
  useEffect(() => {
    const interval = setInterval(() => {
      let p = 20;
      const w = window as Record<string, unknown>;
      if (w.__EASYLOCS_REACT_MOUNTED__) p += 30;
      if (w.__EASYLOCS_BOOTED__) p += 30;
      if (document.readyState === "complete") p += 20;
      setProgress(Math.min(p, 100));
    }, 200);
    return () => clearInterval(interval);
  }, []);
  return progress;
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !sessionStorage.getItem("el_splash_shown");
    } catch {
      return false;
    }
  });
  const [isExiting, setIsExiting] = useState(false);

  const ctx = useMemo(() => getSplashContext(), []);
  const progress = useBootProgress();

  useEffect(() => {
    window.dispatchEvent(new Event("react-splash-ready"));
  }, []);

  useEffect(() => {
    if (!showSplash) return;
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, SPLASH_DURATION - 600);
    const hideTimer = setTimeout(() => {
      setShowSplash(false);
      try {
        sessionStorage.setItem("el_splash_shown", "1");
      } catch {}
    }, SPLASH_DURATION);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [showSplash]);

  const handleSkip = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setShowSplash(false);
      try {
        sessionStorage.setItem("el_splash_shown", "1");
      } catch {}
    }, 400);
  }, []);

  const [color1, color2] = ctx.gradientColors;
  const taglineWords = ["CONNECT", "\u2022", "LOCATE", "\u2022", "GROW"];

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center cursor-pointer overflow-hidden"
            style={{ background: "hsl(228 28% 7%)" }}
            onClick={handleSkip}
            onKeyDown={(e) => e.key === "Enter" && handleSkip()}
            role="button"
            tabIndex={0}
            aria-label="Skip splash screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <style>{`
              @keyframes splashSweepSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes splashGlowPulse {
                0%, 100% { opacity: 0.6; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
              }
              @keyframes splashShimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
              }
              @keyframes splashDotPulse {
                0%, 100% { opacity: 0.015; }
                50% { opacity: 0.03; }
              }
            `}</style>

            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at center, transparent 30%, hsl(228 28% 3%) 100%)`,
                pointerEvents: "none",
              }}
            />

            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle, ${color1.replace(/\)$/, " / 0.25)")} 0.5px, transparent 0.5px)`,
                backgroundSize: "32px 32px",
                animation: "splashDotPulse 4s ease-in-out infinite",
                willChange: "opacity",
              }}
            />

            <BackgroundParticles color={color1} isExiting={isExiting} />

            <motion.div
              className="relative flex flex-col items-center gap-6"
              animate={
                isExiting
                  ? { scale: 1.05, opacity: 0, scaleX: 1.02, scaleY: 1.08 }
                  : { scale: 1, opacity: 1, scaleX: 1, scaleY: 1 }
              }
              transition={
                isExiting
                  ? { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
                  : { duration: 0.3 }
              }
              style={{ willChange: "transform, opacity" }}
            >
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ willChange: "transform, opacity" }}
              >
                <SplashRadar
                  size={RADAR_SIZE}
                  accentColor={color1}
                  isExiting={isExiting}
                />
              </motion.div>

              <div className="flex items-baseline gap-1 overflow-hidden">
                <motion.span
                  className="text-4xl sm:text-5xl font-black tracking-tight text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.6,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    textShadow: `0 0 30px ${color1.replace(/\)$/, " / 0.3)")}`,
                    willChange: "transform, opacity",
                  }}
                >
                  Easy
                </motion.span>
                <motion.span
                  className="text-4xl sm:text-5xl font-black tracking-tight"
                  style={{
                    background: `linear-gradient(135deg, ${color1}, ${color2})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    willChange: "transform, opacity",
                  }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.8,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  -Locs
                </motion.span>
              </div>

              <div className="flex items-center gap-[0.4em] text-[10px] tracking-[0.35em] uppercase font-medium">
                {taglineWords.map((word, i) => (
                  <TaglineWord
                    key={i}
                    word={word}
                    index={i}
                    color={color1.replace(/\)$/, " / 0.6)")}
                  />
                ))}
              </div>

              <PremiumProgressBar
                progress={progress}
                color1={color1}
                color2={color2}
              />

              <SplashEventMotif event={ctx.specialEvent} />
            </motion.div>

            <motion.span
              className="absolute bottom-8 text-[10px] tracking-wider uppercase"
              style={{ color: "hsl(0 0% 100% / 0.2)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: isExiting ? 0 : 1 }}
              transition={{ delay: isExiting ? 0 : 1.6, duration: 0.4 }}
            >
              Tap to continue
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
