import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, Navigation, Info, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;
const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";
const LOW_PASS_ALPHA = 0.15;

interface WebkitDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

interface WebkitDeviceOrientationEventConstructor {
  requestPermission?: () => Promise<string>;
}

function calculateQiblaAngle(lat: number, lng: number): number {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
  const kaabaLngRad = (KAABA_LNG * Math.PI) / 180;

  const dLng = kaabaLngRad - lngRad;
  const x = Math.sin(dLng);
  const y = Math.cos(latRad) * Math.tan(kaabaLatRad) - Math.sin(latRad) * Math.cos(dLng);
  let angle = (Math.atan2(x, y) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lowPassFilter(current: number, previous: number, alpha: number): number {
  let diff = current - previous;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (previous + alpha * diff + 360) % 360;
}

function CompassDial({ heading, qiblaAngle }: { heading: number; qiblaAngle: number }) {
  const isAligned = Math.abs(((qiblaAngle - heading + 540) % 360) - 180) < 5;
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  const dirs: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };

  return (
    <div className="relative w-72 h-72">
      <div className="absolute inset-0 rounded-full transition-shadow duration-300"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 20%) 100%)`,
          border: isAligned ? `3px solid #4ade80` : `2px solid ${GOLD}44`,
          boxShadow: isAligned ? `0 0 40px #4ade8055, 0 0 80px #4ade8022` : `0 0 40px ${GOLD}15`,
        }}
      />
      <motion.div className="absolute inset-0" animate={{ rotate: -heading }} transition={{ type: "spring", stiffness: 60, damping: 15 }}>
        {ticks.map((deg) => {
          const isCardinal = deg % 90 === 0;
          const rad = (deg * Math.PI) / 180;
          const outer = 47;
          const inner = isCardinal ? 38 : 42;
          const x1 = 50 + outer * Math.sin(rad);
          const y1 = 50 - outer * Math.cos(rad);
          const x2 = 50 + inner * Math.sin(rad);
          const y2 = 50 - inner * Math.cos(rad);
          return (
            <svg key={deg} className="absolute inset-0" viewBox="0 0 100 100">
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isCardinal ? GOLD : `${GOLD}44`} strokeWidth={isCardinal ? "1.5" : "0.6"} />
            </svg>
          );
        })}
        {Object.entries(dirs).map(([degStr, label]) => {
          const deg = parseInt(degStr);
          const rad = (deg * Math.PI) / 180;
          const r = 33;
          const x = 50 + r * Math.sin(rad);
          const y = 50 - r * Math.cos(rad);
          return (
            <span key={label} className="absolute text-[0.8125rem] font-bold"
              style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${heading}deg)`, color: label === "N" ? GOLD : "hsl(var(--muted-foreground))" }}>
              {label}
            </span>
          );
        })}
      </motion.div>
      <div className="absolute" style={{ left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(${qiblaAngle}deg)` }}>
        <div className="relative" style={{ width: "4px", height: "120px", marginTop: "-110px" }}>
          <div className="absolute w-full rounded-full" style={{ height: "70%", top: "0", background: `linear-gradient(to bottom, ${GOLD}, transparent)` }} />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">🕋</div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full" style={{ background: GOLD, boxShadow: `0 0 10px ${GOLD}66` }} />
      </div>
    </div>
  );
}

export default function QiblaTab() {
  const { t } = useI18n();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compassSupported, setCompassSupported] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [accuracy, setAccuracy] = useState<string>("...");
  const headingRef = useRef<number>(0);
  const smoothHeadingRef = useRef<number>(0);
  const listenerAddedRef = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(t("islamic.geolocation_unavailable"));
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
        if (pos.coords.accuracy) setAccuracy(`±${Math.round(pos.coords.accuracy)}m`);
      },
      () => {
        setError(t("islamic.enable_geolocation_qibla"));
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [t]);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    let h: number | null = null;
    const webkitEvent = e as WebkitDeviceOrientationEvent;
    if (typeof webkitEvent.webkitCompassHeading === "number") {
      h = webkitEvent.webkitCompassHeading;
    } else if (e.alpha !== null) {
      h = (360 - e.alpha) % 360;
    }
    if (h !== null) {
      const smoothed = lowPassFilter(h, smoothHeadingRef.current, LOW_PASS_ALPHA);
      smoothHeadingRef.current = smoothed;
      headingRef.current = smoothed;
      setHeading(smoothed);
      setCompassSupported(true);
    }
  }, []);

  const startCompass = useCallback(() => {
    if (listenerAddedRef.current) return;
    if (typeof DeviceOrientationEvent !== "undefined") {
      const DOE = DeviceOrientationEvent as unknown as WebkitDeviceOrientationEventConstructor;
      if (typeof DOE.requestPermission === "function") {
        DOE.requestPermission()
          .then((state: string) => {
            if (state === "granted") {
              window.addEventListener("deviceorientation", handleOrientation, true);
              listenerAddedRef.current = true;
              setNeedsPermission(false);
            } else {
              setError("Permission boussole refusée. Activez-la dans Réglages > Safari.");
            }
          })
          .catch(() => {
            setError("Impossible de demander l'accès à la boussole.");
          });
      } else {
        window.addEventListener("deviceorientation", handleOrientation, true);
        listenerAddedRef.current = true;
      }
    }
  }, [handleOrientation]);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== "undefined") {
      const DOE = DeviceOrientationEvent as unknown as WebkitDeviceOrientationEventConstructor;
      if (typeof DOE.requestPermission === "function") {
        setNeedsPermission(true);
      } else {
        startCompass();
      }
    }
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
      listenerAddedRef.current = false;
    };
  }, [handleOrientation, startCompass]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
        <p className="text-sm text-muted-foreground">{t("islamic.detecting_position")}</p>
      </div>
    );
  }

  if (error && !position) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">🧭</span>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!position) return null;

  const qiblaAngle = calculateQiblaAngle(position.lat, position.lng);
  const distance = haversineDistance(position.lat, position.lng, KAABA_LAT, KAABA_LNG);
  const currentHeading = heading ?? 0;
  const isAligned = compassSupported && heading !== null && Math.abs(((qiblaAngle - heading + 540) % 360) - 180) < 5;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>{t("islamic.qibla_compass")}</h2>
        <p className="text-xs text-muted-foreground">{t("islamic.direction_of_mecca")}</p>
      </div>

      {needsPermission && !compassSupported && (
        <button onClick={startCompass} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: GOLD, color: NAVY }}>
          <Navigation size={16} />
          {t("islamic.activate_compass")}
        </button>
      )}

      {isAligned && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-4 text-center" style={{ background: "rgba(74, 222, 128, 0.15)", border: "1px solid rgba(74, 222, 128, 0.4)" }}>
          <p className="text-sm font-bold" style={{ color: "#4ade80" }}>{t("islamic.facing_qibla")}</p>
        </motion.div>
      )}

      <div className="flex justify-center">
        {compassSupported && heading !== null ? (
          <CompassDial heading={currentHeading} qiblaAngle={qiblaAngle} />
        ) : (
          <div className="relative w-64 h-64">
            <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 20%) 100%)`, border: `2px solid ${GOLD}44`, boxShadow: `0 0 40px ${GOLD}15` }} />
            {["N", "E", "S", "W"].map((dir, i) => {
              const angle = i * 90;
              const rad = (angle * Math.PI) / 180;
              const x = 50 + 42 * Math.sin(rad);
              const y = 50 - 42 * Math.cos(rad);
              return (
                <span key={dir} className="absolute text-[0.6875rem] font-bold" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", color: dir === "N" ? GOLD : "hsl(var(--muted-foreground))" }}>
                  {dir}
                </span>
              );
            })}
            <div className="absolute inset-4 flex items-center justify-center" style={{ transform: `rotate(${qiblaAngle}deg)` }}>
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="absolute w-1 rounded-full" style={{ height: "45%", top: "5%", left: "calc(50% - 2px)", background: `linear-gradient(to bottom, ${GOLD}, transparent)` }} />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl">🕋</div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full" style={{ background: GOLD, boxShadow: `0 0 10px ${GOLD}66` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1">{t("islamic.qibla_angle")}</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: GOLD }}>{qiblaAngle.toFixed(1)}°</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1">{t("islamic.distance")}</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: GOLD }}>{Math.round(distance)} km</p>
        </div>
      </div>

      {!compassSupported && (
        <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--muted)/0.3)", border: "1px solid hsl(var(--border))" }}>
          <Navigation size={20} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {t("islamic.compass_unavailable")}
          </p>
        </div>
      )}

      <button onClick={() => setShowCalibration(!showCalibration)} className="flex items-center gap-2 mx-auto text-xs text-muted-foreground">
        <Info size={14} />
        {t("islamic.calibrate_compass")}
      </button>

      {showCalibration && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center gap-2">
            <RefreshCw size={16} style={{ color: GOLD }} />
            <p className="text-sm font-semibold" style={{ color: GOLD }}>{t("islamic.magnetometer_calibration")}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("islamic.calibration_instructions")}
          </p>
          <div className="flex justify-center py-2">
            <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
              <path d="M20 30 C20 15 35 10 40 30 C45 50 60 45 60 30 C60 15 45 10 40 30 C35 50 20 45 20 30Z" stroke={GOLD} strokeWidth="2" strokeDasharray="4 3" fill="none" />
              <circle cx="20" cy="30" r="3" fill={GOLD} />
            </svg>
          </div>
        </div>
      )}

      <div className="text-center">
        <p className="text-[0.625rem] text-muted-foreground">
          {t("islamic.coordinates")}: {position.lat.toFixed(4)}°N, {position.lng.toFixed(4)}°E · {accuracy}
        </p>
      </div>
    </div>
  );
}
