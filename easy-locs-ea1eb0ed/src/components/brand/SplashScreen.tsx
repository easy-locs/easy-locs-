import React, { useState, useEffect, useCallback, useId, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTimeOfDay, getSpecialEvent, TIME_GRADIENTS } from "@/hooks/useDynamicLogo";
import type { SpecialEvent } from "@/hooks/useDynamicLogo";

const SPLASH_DURATION = 2000;

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
    new_year: { emoji: "🎉", count: 6 },
    christmas: { emoji: "❄", count: 5 },
    valentine: { emoji: "♥", count: 4 },
    ramadan: { emoji: "☪", count: 5 },
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

function SplashRadar({ size, accentColor }: { size: number; accentColor: string }) {
  const uid = useId().replace(/:/g, "_");
  const half = size / 2;
  const radii = [half * 0.25, half * 0.45, half * 0.65, half * 0.85];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {radii.map((r, i) => (
        <motion.circle
          key={i}
          cx={half}
          cy={half}
          r={r}
          stroke={accentColor}
          strokeWidth={1}
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.35 - i * 0.06 }}
          transition={{ duration: 0.4, delay: i * 0.15, ease: "easeOut" }}
        />
      ))}
      <motion.path
        d={`M ${half} ${half} L ${half + radii[3]} ${half} A ${radii[3]} ${radii[3]} 0 0 1 ${half + radii[3] * Math.cos(Math.PI / 4)} ${half - radii[3] * Math.sin(Math.PI / 4)} Z`}
        fill={`url(#splash-sweep-${uid})`}
        opacity={0.5}
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: `${half}px ${half}px` }}
      />
      <motion.circle
        cx={half}
        cy={half}
        r={half * 0.08}
        fill={accentColor}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3, ease: "backOut" }}
      />
      {[1.3, 1.6].map((factor, i) => (
        <motion.circle
          key={`pulse-${i}`}
          cx={half}
          cy={half}
          r={radii[3] * factor}
          stroke={accentColor}
          strokeWidth={0.5}
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.8 + i * 0.5, ease: "easeInOut" }}
        />
      ))}
      <defs>
        <radialGradient id={`splash-sweep-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function AnimatedText({ text, delay, glowColor }: { text: string; delay: number; glowColor: string }) {
  return (
    <span className="inline-flex" aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.04, duration: 0.3, ease: "easeOut" }}
          style={{
            display: "inline-block",
            textShadow: `0 0 20px ${glowColor}66`,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return !sessionStorage.getItem("el_splash_shown"); } catch { return false; }
  });

  const ctx = useMemo(() => getSplashContext(), []);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
      try { sessionStorage.setItem("el_splash_shown", "1"); } catch {}
    }, SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, [showSplash]);

  const handleSkip = useCallback(() => {
    setShowSplash(false);
    try { sessionStorage.setItem("el_splash_shown", "1"); } catch {}
  }, []);

  const [color1, color2] = ctx.gradientColors;

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center cursor-pointer"
            style={{ background: "hsl(228 28% 7%)" }}
            onClick={handleSkip}
            onKeyDown={(e) => e.key === "Enter" && handleSkip()}
            role="button"
            tabIndex={0}
            aria-label="Skip splash screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute inset-0 opacity-[0.015]" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, ${color1} 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }} />

            <div className="relative flex flex-col items-center gap-6">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <SplashRadar size={100} accentColor={color1} />
              </motion.div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  <AnimatedText text="Easy" delay={0.6} glowColor={color1} />
                </span>
                <span
                  className="text-4xl sm:text-5xl font-black tracking-tight"
                  style={{
                    background: `linear-gradient(135deg, ${color1}, ${color2})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  <AnimatedText text="-Locs" delay={0.8} glowColor={color1} />
                </span>
              </div>

              <motion.span
                className="text-[10px] tracking-[0.35em] uppercase font-medium"
                style={{ color: color1.replace(/\)$/, " / 0.6)") }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.6 }}
              >
                Connect • Locate • Grow
              </motion.span>

              <SplashEventMotif event={ctx.specialEvent} />
            </div>

            <motion.span
              className="absolute bottom-8 text-[10px] tracking-wider uppercase"
              style={{ color: "hsl(0 0% 100% / 0.2)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.4 }}
            >
              Tap to continue
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
