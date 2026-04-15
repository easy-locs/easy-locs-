import { memo, useMemo } from "react";
import type { WeatherStationState } from "@/hooks/useLiveWeatherStation";
import type { WeatherEffectsLevel } from "@/stores/weatherDisplayStore";

interface Props {
  weather: WeatherStationState;
  effectsLevel: WeatherEffectsLevel;
}

type WeatherCondition = "rain" | "snow" | "sunny" | "cloudy" | "wind" | "fog" | "night" | "storm" | "default";

function deriveCondition(weather: WeatherStationState): WeatherCondition {
  const code = weather.weatherCode;
  if (code !== null && code >= 95) return "storm";
  if (weather.isRaining) return "rain";
  if (code !== null && code >= 71 && code <= 77) return "snow";
  if (code !== null && code >= 45 && code <= 48) return "fog";
  if (code !== null && code >= 2 && code <= 3) return "cloudy";

  if (!weather.isDay) return "night";

  if (code !== null && code <= 1) return "sunny";
  return "default";
}

const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;
const REDUCED_MOTION = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function RainOverlay({ intensity, immersive }: { intensity: number; immersive: boolean }) {
  const dropCount = immersive ? (IS_MOBILE ? 40 : 80) : (IS_MOBILE ? 15 : 30);
  const drops = useMemo(() =>
    Array.from({ length: dropCount }, (_, i) => ({
      left: `${(i / dropCount) * 100 + Math.random() * (100 / dropCount)}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${0.5 + Math.random() * 0.4}s`,
      height: intensity > 3 ? 18 : intensity > 1 ? 14 : 10,
      opacity: 0.15 + Math.random() * 0.35,
    })), [dropCount, intensity]);

  return (
    <>
      <div
        className="weather-fx-atmosphere"
        style={{
          background: immersive
            ? "linear-gradient(180deg, rgba(30,50,80,0.35) 0%, rgba(20,35,60,0.18) 40%, transparent 100%)"
            : "linear-gradient(180deg, rgba(30,50,80,0.15) 0%, transparent 60%)",
        }}
      />
      {!REDUCED_MOTION && drops.map((d, i) => (
        <div
          key={i}
          className="weather-fx-raindrop"
          style={{
            left: d.left,
            animationDelay: d.delay,
            animationDuration: d.duration,
            height: d.height,
            opacity: d.opacity,
          }}
        />
      ))}
    </>
  );
}

function SnowOverlay({ immersive }: { immersive: boolean }) {
  const flakeCount = immersive ? (IS_MOBILE ? 25 : 50) : (IS_MOBILE ? 10 : 20);
  const flakes = useMemo(() =>
    Array.from({ length: flakeCount }, (_, i) => ({
      left: `${(i / flakeCount) * 100 + Math.random() * (100 / flakeCount)}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 3}s`,
      size: 2 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 40,
    })), [flakeCount]);

  return (
    <>
      <div
        className="weather-fx-atmosphere"
        style={{
          background: immersive
            ? "linear-gradient(180deg, rgba(180,200,230,0.2) 0%, rgba(150,180,220,0.08) 50%, transparent 100%)"
            : "linear-gradient(180deg, rgba(180,200,230,0.1) 0%, transparent 50%)",
        }}
      />
      {!REDUCED_MOTION && flakes.map((f, i) => (
        <div
          key={i}
          className="weather-fx-snowflake"
          style={{
            left: f.left,
            animationDelay: f.delay,
            animationDuration: f.duration,
            width: f.size,
            height: f.size,
            "--snow-drift": `${f.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function SunOverlay({ immersive }: { immersive: boolean }) {
  return (
    <>
      <div
        className="weather-fx-atmosphere"
        style={{
          background: immersive
            ? "radial-gradient(ellipse at 70% -10%, rgba(255,200,50,0.18) 0%, rgba(255,170,40,0.06) 40%, transparent 70%)"
            : "radial-gradient(ellipse at 70% -10%, rgba(255,200,50,0.08) 0%, transparent 50%)",
        }}
      />
      {immersive && !REDUCED_MOTION && (
        <div className="weather-fx-sunrays" />
      )}
    </>
  );
}

function CloudOverlay({ immersive }: { immersive: boolean }) {
  return (
    <div
      className="weather-fx-atmosphere"
      style={{
        background: immersive
          ? "linear-gradient(180deg, rgba(120,130,150,0.22) 0%, rgba(100,110,130,0.1) 40%, transparent 80%)"
          : "linear-gradient(180deg, rgba(120,130,150,0.1) 0%, transparent 50%)",
      }}
    />
  );
}

function FogOverlay({ immersive }: { immersive: boolean }) {
  return (
    <div
      className="weather-fx-atmosphere"
      style={{
        background: immersive
          ? "linear-gradient(180deg, rgba(180,190,200,0.3) 0%, rgba(160,170,185,0.15) 50%, rgba(140,150,165,0.05) 100%)"
          : "linear-gradient(180deg, rgba(180,190,200,0.15) 0%, transparent 60%)",
      }}
    />
  );
}

function NightOverlay({ immersive }: { immersive: boolean }) {
  return (
    <div
      className="weather-fx-atmosphere"
      style={{
        background: immersive
          ? "linear-gradient(180deg, rgba(5,10,30,0.35) 0%, rgba(10,15,40,0.15) 50%, transparent 100%)"
          : "linear-gradient(180deg, rgba(5,10,30,0.15) 0%, transparent 50%)",
      }}
    />
  );
}

function WindOverlay({ windKmh, immersive }: { windKmh: number; immersive: boolean }) {
  if (REDUCED_MOTION || windKmh < 25) return null;
  const particleCount = immersive ? (IS_MOBILE ? 8 : 15) : (IS_MOBILE ? 4 : 8);
  const particles = useMemo(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      top: `${10 + (i / particleCount) * 80}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${1.2 + Math.random() * 0.8}s`,
      width: 20 + Math.random() * 30,
      opacity: 0.08 + Math.random() * 0.15,
    })), [particleCount]);

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="weather-fx-wind-particle"
          style={{
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.width,
            opacity: p.opacity,
          }}
        />
      ))}
    </>
  );
}

export default memo(function MapWeatherEffectsOverlay({ weather, effectsLevel }: Props) {
  if (effectsLevel === "off") return null;

  const condition = deriveCondition(weather);
  const immersive = effectsLevel === "immersive";
  const windKmh = weather.windKmh ?? 0;

  return (
    <div className="weather-fx-container">
      {condition === "rain" && <RainOverlay intensity={weather.precipitationMm} immersive={immersive} />}
      {condition === "storm" && <RainOverlay intensity={Math.max(weather.precipitationMm, 5)} immersive={true} />}
      {condition === "snow" && <SnowOverlay immersive={immersive} />}
      {condition === "sunny" && <SunOverlay immersive={immersive} />}
      {condition === "cloudy" && <CloudOverlay immersive={immersive} />}
      {condition === "fog" && <FogOverlay immersive={immersive} />}
      {condition === "night" && <NightOverlay immersive={immersive} />}
      {windKmh >= 25 && <WindOverlay windKmh={windKmh} immersive={immersive} />}
    </div>
  );
});
