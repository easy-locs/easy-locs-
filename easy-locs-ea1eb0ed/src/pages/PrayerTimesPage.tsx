/**
 * PrayerTimesPage — Islamic prayer times, mosque finder & adhan notifications.
 * Available only in countries with religionModuleAvailable: true.
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, MapPin, Bell, BellOff,
  Navigation, Clock, AlertTriangle, Loader2,
} from "lucide-react";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOSMPlaces } from "@/lib/geo/osm-places-engine";
import { haversineKm } from "@/lib/geo/distance";
import SEOHead from "@/components/SEOHead";
import { Switch } from "@/components/ui/switch";
import { fetchAdhanNotificationPrefs, upsertAdhanNotificationPrefs } from "@/services/domain/orbit.service";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const PRAYER_ICONS: Record<string, string> = {
  Fajr: "🌙",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌅",
  Isha: "🌃",
};

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";

interface MosqueSummary {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  distanceKm: number;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function PrayerCard({
  name, nameAr, time, isNext, isPassed, countdown, icon,
}: {
  name: string; nameAr: string; time: string; isNext: boolean; isPassed: boolean;
  countdown?: string; icon: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: isNext
          ? `linear-gradient(135deg, ${NAVY} 0%, hsl(226 24% 18%) 100%)`
          : isPassed
          ? "hsl(var(--muted)/0.4)"
          : "hsl(var(--card))",
        border: isNext ? `1px solid ${GOLD}55` : "1px solid hsl(var(--border))",
        boxShadow: isNext ? `0 0 24px ${GOLD}22` : undefined,
      }}
    >
      {isNext && (
        <div
          className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl"
          style={{ background: GOLD, color: NAVY }}
        >
          Prochaine
        </div>
      )}

      <div className="flex items-center gap-4 p-4">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl text-2xl shrink-0"
          style={{
            background: isNext ? `${GOLD}22` : "hsl(var(--muted)/0.6)",
          }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: isNext ? GOLD : isPassed ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}
            >
              {name}
            </span>
            <span
              className="text-[11px]"
              style={{ color: isNext ? `${GOLD}99` : "hsl(var(--muted-foreground))", fontFamily: "serif" }}
            >
              {nameAr}
            </span>
          </div>
          {isNext && countdown && (
            <p className="text-[11px] mt-0.5" style={{ color: `${GOLD}cc` }}>
              dans {countdown}
            </p>
          )}
        </div>

        <span
          className="text-sm font-bold tabular-nums shrink-0"
          style={{ color: isNext ? GOLD : isPassed ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}
        >
          {time}
        </span>
      </div>
    </motion.div>
  );
}

function MosqueCard({ mosque }: { mosque: MosqueSummary }) {
  const openDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}
      >
        <span className="text-lg">🕌</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{mosque.name}</p>
        {mosque.address && (
          <p className="text-[11px] text-muted-foreground truncate">{mosque.address}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <div className="text-right">
          <p className="text-xs font-bold tabular-nums" style={{ color: GOLD }}>
            {mosque.distanceKm < 1
              ? `${Math.round(mosque.distanceKm * 1000)}m`
              : `${mosque.distanceKm.toFixed(1)}km`}
          </p>
          <p className="text-[10px] text-muted-foreground">distance</p>
        </div>
        <button
          onClick={openDirections}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
          aria-label="Itinéraire"
        >
          <Navigation size={14} style={{ color: GOLD }} />
        </button>
      </div>
    </motion.div>
  );
}

export default function PrayerTimesPage() {
  useUiEngine("prayertimespage");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { detection } = useGeoDetect();
  const country = detection?.country ?? "AE";

  const {
    loading, error, prayers, nextPrayer, hijriDate, gregorianDate,
    countdown, lat, lng, locationSource,
  } = usePrayerTimes(country);

  const [mosques, setMosques] = useState<MosqueSummary[]>([]);
  const [mosquesLoading, setMosquesLoading] = useState(false);
  const [mosquesError, setMosquesError] = useState<string | null>(null);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load notification prefs
  useEffect(() => {
    if (!user?.id) return;
    fetchAdhanNotificationPrefs(user.id)
      .then((data) => {
        if (data) setNotifEnabled(data.enabled ?? false);
        setPrefsLoaded(true);
      })
      .catch(() => setPrefsLoaded(true));
  }, [user?.id]);

  // Load nearby mosques when lat/lng available
  useEffect(() => {
    if (lat === null || lng === null) return;

    setMosquesLoading(true);
    setMosquesError(null);

    fetchOSMPlaces(lat, lng, { radiusM: 3000, limit: 50 })
      .then(places => {
        const mosque_places = places.filter(
          p => p.subcategory === "mosque"
        );
        const mapped: MosqueSummary[] = mosque_places
          .map(p => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            address: p.address,
            distanceKm: haversineKm(lat, lng, p.lat, p.lng),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 30);
        setMosques(mapped);
      })
      .catch(() => setMosquesError("Impossible de charger les mosquées proches."))
      .finally(() => setMosquesLoading(false));
  }, [lat, lng]);

  const toggleNotifications = useCallback(async () => {
    if (!user?.id) {
      toast.error("Connectez-vous pour activer les notifications adhan.");
      return;
    }

    setNotifLoading(true);
    const newVal = !notifEnabled;

    try {
      // Request browser push permission if enabling
      if (newVal && "Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.error("Notifications refusées par le navigateur.");
          setNotifLoading(false);
          return;
        }
      }

      await upsertAdhanNotificationPrefs(user.id, newVal);

      setNotifEnabled(newVal);
      toast.success(newVal
        ? "Notifications adhan activées ✓"
        : "Notifications adhan désactivées");
    } catch {
      toast.error("Erreur lors de la mise à jour des préférences.");
    } finally {
      setNotifLoading(false);
    }
  }, [user?.id, notifEnabled]);

  return (
    <SubPageShell>
      <SEOHead
        title="Horaires de Prière — Easy-Locs"
        description="Consultez les horaires de prière islamique et trouvez les mosquées proches de vous."
      />

      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{ background: NAVY, borderBottom: `1px solid ${GOLD}33` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
          aria-label="Retour"
        >
          <ChevronLeft size={20} style={{ color: GOLD }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate" style={{ color: GOLD }}>
            Horaires de Prière
          </h1>
          {gregorianDate && (
            <p className="text-[11px] truncate" style={{ color: `${GOLD}99` }}>
              {gregorianDate}{hijriDate ? ` — ${hijriDate}` : ""}
            </p>
          )}
        </div>
        <div
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
          style={{ background: `${GOLD}18`, color: GOLD }}
        >
          {locationSource === "gps" ? <Navigation size={10} /> : <MapPin size={10} />}
          {locationSource === "gps" ? "GPS" : country}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Next prayer highlight */}
        {!loading && nextPrayer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl p-5 text-center"
            style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 18%) 100%)`,
              border: `1px solid ${GOLD}44`,
              boxShadow: `0 8px 32px ${GOLD}18`,
            }}
          >
            <div className="text-4xl mb-2">{PRAYER_ICONS[nextPrayer.name] ?? "🕌"}</div>
            <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: `${GOLD}99` }}>
              Prochaine prière
            </p>
            <p className="text-2xl font-bold mb-1" style={{ color: GOLD }}>{nextPrayer.name}</p>
            <p className="text-3xl font-extrabold tabular-nums mb-2" style={{ color: "#fff" }}>
              {nextPrayer.time}
            </p>
            {countdown && (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: `${GOLD}22`, color: GOLD }}
              >
                <Clock size={12} />
                dans {countdown}
              </div>
            )}
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
            <p className="text-sm text-muted-foreground">Chargement des horaires…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: "hsl(var(--destructive)/0.1)", border: "1px solid hsl(var(--destructive)/0.3)" }}
          >
            <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Activez la géolocalisation ou vérifiez votre connexion.
              </p>
            </div>
          </div>
        )}

        {/* Prayers list */}
        {!loading && !error && prayers.length > 0 && (
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wide mb-2.5 px-0.5"
              style={{ color: `${GOLD}bb` }}>
              Les 5 Prières du Jour
            </h2>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {prayers.map(prayer => (
                <PrayerCard
                  key={prayer.name}
                  name={prayer.name}
                  nameAr={prayer.nameAr}
                  time={prayer.time}
                  isNext={prayer.isNext}
                  isPassed={prayer.isPassed}
                  countdown={prayer.isNext ? countdown : undefined}
                  icon={PRAYER_ICONS[prayer.name] ?? "🕌"}
                />
              ))}
            </motion.div>
          </div>
        )}

        {/* Adhan Notifications */}
        {!loading && !error && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${GOLD}18` }}
            >
              {notifEnabled ? <Bell size={20} style={{ color: GOLD }} /> : <BellOff size={18} className="text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Notifications Adhan</p>
              <p className="text-[11px] text-muted-foreground">
                {notifEnabled
                  ? "Rappels activés pour chaque prière"
                  : "Activez les rappels avant la prière"}
              </p>
            </div>
            <Switch
              checked={notifEnabled}
              onCheckedChange={toggleNotifications}
              disabled={notifLoading}
              aria-label="Activer les notifications adhan"
            />
          </div>
        )}

        {/* Mosquées proches */}
        {!loading && lat !== null && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[13px] font-bold uppercase tracking-wide px-0.5"
                style={{ color: `${GOLD}bb` }}>
                Mosquées Proches
              </h2>
              {locationSource === "gps" && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Navigation size={10} /> GPS
                </span>
              )}
            </div>

            {mosquesLoading && (
              <div className="flex items-center gap-2 py-4 px-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                Recherche des mosquées…
              </div>
            )}

            {!mosquesLoading && mosquesError && (
              <p className="text-xs text-muted-foreground px-1 py-2">{mosquesError}</p>
            )}

            {!mosquesLoading && !mosquesError && mosques.length === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">🕌</span>
                <p className="text-sm text-muted-foreground">
                  Aucune mosquée trouvée dans un rayon de 3 km.
                </p>
              </div>
            )}

            {!mosquesLoading && mosques.length > 0 && (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {mosques.map(m => (
                  <MosqueCard key={m.id} mosque={m} />
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Method info */}
        {!loading && !error && (
          <div className="text-center py-2">
            <p className="text-[10px] text-muted-foreground">
              Horaires calculés via Al-Adhan (méthode ISNA) · Mis à jour quotidiennement
            </p>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
