import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, Navigation } from "lucide-react";

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;
const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";

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

export default function QiblaTab() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compassSupported, setCompassSupported] = useState(false);
  const headingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Géolocalisation non disponible.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setError("Activez la géolocalisation pour voir la Qibla.");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  }, []);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    let h: number | null = null;
    const webkitEvent = e as WebkitDeviceOrientationEvent;
    if (typeof webkitEvent.webkitCompassHeading === "number") {
      h = webkitEvent.webkitCompassHeading;
    } else if (e.alpha !== null) {
      h = 360 - e.alpha;
    }
    if (h !== null) {
      headingRef.current = h;
      setHeading(h);
      setCompassSupported(true);
    }
  }, []);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== "undefined") {
      const DOE = DeviceOrientationEvent as unknown as WebkitDeviceOrientationEventConstructor;
      if (typeof DOE.requestPermission === "function") {
        DOE.requestPermission()
          .then((state: string) => {
            if (state === "granted") {
              window.addEventListener("deviceorientation", handleOrientation, true);
            }
          })
          .catch(() => {});
      } else {
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    }
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [handleOrientation]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
        <p className="text-sm text-muted-foreground">Détection de votre position...</p>
      </div>
    );
  }

  if (error) {
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
  const rotation = compassSupported && heading !== null
    ? qiblaAngle - heading
    : qiblaAngle;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>Boussole Qibla</h2>
        <p className="text-xs text-muted-foreground">Direction de la Mecque (Kaaba)</p>
      </div>

      <div className="flex justify-center">
        <div className="relative w-64 h-64">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 20%) 100%)`,
              border: `2px solid ${GOLD}44`,
              boxShadow: `0 0 40px ${GOLD}15`,
            }}
          />

          {["N", "E", "S", "W"].map((dir, i) => {
            const angle = i * 90;
            const rad = (angle * Math.PI) / 180;
            const x = 50 + 42 * Math.sin(rad);
            const y = 50 - 42 * Math.cos(rad);
            return (
              <span
                key={dir}
                className="absolute text-[11px] font-bold"
                style={{
                  left: `${x}%`, top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  color: dir === "N" ? GOLD : "hsl(var(--muted-foreground))",
                }}
              >
                {dir}
              </span>
            );
          })}

          <motion.div
            className="absolute inset-4 flex items-center justify-center"
            animate={{ rotate: rotation }}
            transition={{ type: "spring", stiffness: 60, damping: 12 }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <div
                className="absolute w-1 rounded-full"
                style={{
                  height: "45%", top: "5%", left: "calc(50% - 2px)",
                  background: `linear-gradient(to bottom, ${GOLD}, transparent)`,
                }}
              />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl">🕋</div>
            </div>
          </motion.div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full" style={{ background: GOLD, boxShadow: `0 0 10px ${GOLD}66` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Angle Qibla</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: GOLD }}>{qiblaAngle.toFixed(1)}°</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Distance</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: GOLD }}>{Math.round(distance)} km</p>
        </div>
      </div>

      {!compassSupported && (
        <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--muted)/0.3)", border: "1px solid hsl(var(--border))" }}>
          <Navigation size={20} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Boussole magnétique non disponible. L'angle affiché est relatif au Nord géographique.
          </p>
        </div>
      )}

      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">
          Coordonnées : {position.lat.toFixed(4)}°N, {position.lng.toFixed(4)}°E
        </p>
      </div>
    </div>
  );
}
