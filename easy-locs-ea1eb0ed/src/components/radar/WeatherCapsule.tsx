import { memo } from "react";
import { motion } from "framer-motion";
import type { WeatherStationState } from "@/hooks/useLiveWeatherStation";

interface Props {
  weather: WeatherStationState;
  className?: string;
}

function RainDrops() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${12 + i * 14}%`,
            top: -6,
            width: 2,
            height: 8,
            background: "hsl(200 85% 70% / 0.5)",
          }}
          animate={{
            y: [0, 52, 0],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

function SunGlow() {
  return (
    <>
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: "radial-gradient(circle at 30% 40%, hsl(45 100% 60% / 0.2) 0%, hsl(35 100% 55% / 0.08) 50%, transparent 80%)",
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 28,
          height: 28,
          top: 4,
          left: 6,
          background: "radial-gradient(circle, hsl(45 100% 65% / 0.3) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </>
  );
}

function SnowFlakes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: `${15 + i * 16}%`,
            top: -3,
            background: "hsl(210 30% 95% / 0.8)",
            boxShadow: "0 0 3px hsl(210 50% 90% / 0.5)",
          }}
          animate={{
            y: [0, 44],
            x: [0, i % 2 === 0 ? 6 : -6, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay: i * 0.35,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export default memo(function WeatherCapsule({ weather, className }: Props) {
  const isSnow = weather.label?.toLowerCase().includes("snow") || weather.icon === "❄️";
  const isSunny = !weather.isRaining && !isSnow && (weather.icon === "☀️" || weather.icon === "🌤️");
  const bgColor = weather.isRaining
    ? "hsl(210 55% 15% / 0.85)"
    : isSnow
      ? "hsl(220 35% 18% / 0.85)"
      : isSunny
        ? "hsl(35 40% 15% / 0.82)"
        : "hsl(var(--card) / 0.82)";

  const borderCol = weather.isRaining
    ? "hsl(200 70% 55% / 0.3)"
    : isSnow
      ? "hsl(210 50% 70% / 0.25)"
      : isSunny
        ? "hsl(40 80% 55% / 0.25)"
        : "hsl(var(--border) / 0.15)";

  const glowShadow = weather.isRaining
    ? "0 4px 24px hsl(200 70% 40% / 0.25), inset 0 1px 0 hsl(200 60% 60% / 0.1)"
    : isSnow
      ? "0 4px 24px hsl(220 40% 50% / 0.2), inset 0 1px 0 hsl(220 30% 80% / 0.1)"
      : isSunny
        ? "0 4px 24px hsl(40 80% 45% / 0.25), inset 0 1px 0 hsl(45 90% 70% / 0.15)"
        : "0 4px 20px hsl(var(--background) / 0.3)";

  return (
    <motion.div
      className={`relative flex items-center gap-2 rounded-2xl border px-3 py-2.5 backdrop-blur-2xl ${className || ""}`}
      style={{
        background: bgColor,
        borderColor: borderCol,
        boxShadow: glowShadow,
        minWidth: 72,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      {weather.isRaining && <RainDrops />}
      {isSunny && <SunGlow />}
      {isSnow && <SnowFlakes />}

      <span className="text-2xl leading-none relative z-10 drop-shadow-sm">
        {weather.loading ? "⏳" : weather.icon}
      </span>

      <div className="relative z-10 flex flex-col items-start min-w-0">
        {weather.temperatureC != null && (
          <span className="text-[17px] font-extrabold text-foreground leading-tight tracking-tight">
            {Math.round(weather.temperatureC)}°
          </span>
        )}
        {weather.isRaining && weather.precipitationMm > 0 && (
          <span className="text-[9px] font-semibold leading-tight" style={{ color: "hsl(200 75% 68%)" }}>
            {weather.precipitationMm.toFixed(1)}mm
          </span>
        )}
        {!weather.isRaining && weather.label && (
          <span className="text-[9px] font-medium text-muted-foreground/70 leading-tight truncate max-w-[48px]">
            {weather.label}
          </span>
        )}
      </div>

      <div className="relative z-10 flex items-center ml-0.5">
        <span className="relative flex h-[5px] w-[5px]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-emerald-500" />
        </span>
      </div>
    </motion.div>
  );
});
