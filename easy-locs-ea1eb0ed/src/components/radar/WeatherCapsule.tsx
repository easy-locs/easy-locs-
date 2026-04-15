import { memo } from "react";
import { motion } from "framer-motion";
import type { WeatherStationState } from "@/hooks/useLiveWeatherStation";

interface Props {
  weather: WeatherStationState;
  className?: string;
}

function RainDrops() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-full">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[2px] rounded-full"
          style={{
            left: `${20 + i * 18}%`,
            top: -4,
            height: 6,
            background: "hsl(200 80% 65% / 0.6)",
          }}
          animate={{
            y: [0, 28, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

function SunGlow() {
  return (
    <motion.div
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        background: "radial-gradient(circle, hsl(40 90% 55% / 0.15) 0%, transparent 70%)",
      }}
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function SnowFlakes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-full">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${25 + i * 20}%`,
            top: -2,
            background: "white",
          }}
          animate={{
            y: [0, 24],
            x: [0, i % 2 === 0 ? 4 : -4, 0],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
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

  return (
    <motion.div
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-2 backdrop-blur-xl ${className || ""}`}
      style={{
        background: weather.isRaining
          ? "hsl(210 50% 18% / 0.88)"
          : isSnow
            ? "hsl(220 30% 20% / 0.88)"
            : "hsl(var(--card) / 0.88)",
        borderColor: weather.isRaining
          ? "hsl(200 70% 50% / 0.25)"
          : "hsl(var(--border) / 0.12)",
        boxShadow: "0 4px 20px hsl(var(--background) / 0.3)",
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      {weather.isRaining && <RainDrops />}
      {isSunny && <SunGlow />}
      {isSnow && <SnowFlakes />}

      <span className="text-base leading-none relative z-10">
        {weather.loading ? "⏳" : weather.icon}
      </span>

      {weather.temperatureC != null && (
        <span className="text-[13px] font-bold text-foreground relative z-10">
          {Math.round(weather.temperatureC)}°
        </span>
      )}

      {weather.isRaining && weather.precipitationMm > 0 && (
        <span className="text-[10px] font-semibold relative z-10" style={{ color: "hsl(200 70% 65%)" }}>
          {weather.precipitationMm.toFixed(1)}mm
        </span>
      )}

      <div className="relative z-10 flex items-center gap-1 ml-0.5">
        <span className="relative flex h-[5px] w-[5px]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-emerald-500" />
        </span>
      </div>
    </motion.div>
  );
});
