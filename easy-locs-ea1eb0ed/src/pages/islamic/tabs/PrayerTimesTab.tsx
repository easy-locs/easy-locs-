import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Bell, BellOff, Navigation, Clock, AlertTriangle, Loader2, MapPin, ExternalLink,
  Volume2, VolumeX, Play, Square, Check, Flame,
} from "lucide-react";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOSMPlaces } from "@/lib/geo/osm-places-engine";
import { haversineKm } from "@/lib/geo/distance";
import { Switch } from "@/components/ui/switch";
import {
  fetchAdhanNotificationFullPrefs,
  upsertAdhanNotificationFullPrefs,
} from "@/services/domain/orbit.service";
import { toast } from "sonner";
import { CALCULATION_METHODS, ASR_METHODS, getDefaultMethod, getDefaultAsrMethod } from "@/data/islamic/calculation-methods";
import { MUEZZIN_VOICES } from "@/data/islamic/muezzin-voices";
import {
  getStoredMuezzinId, setStoredMuezzinId,
  getAdhanVolume, setAdhanVolume,
  playAdhanPreview, stopAdhan, isAdhanPlaying,
} from "@/lib/adhan-audio";

const PRAYER_ICONS: Record<string, string> = {
  Imsak: "🍽️", Fajr: "🌙", Sunrise: "🌅", Dhuhr: "☀️", Asr: "🌤️", Maghrib: "🌅", Isha: "🌃", Sunset: "🌇", Midnight: "🕛", Tahajjud: "🌌",
};

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";

const NOTIFICATION_OFFSETS = [0, 5, 10, 15, 30];

const LS_METHOD_KEY = "islamic_prayer_method";
const LS_SCHOOL_KEY = "islamic_prayer_school";
const LS_PRAYER_JOURNAL_KEY = "islamic_prayer_journal";

interface PrayerJournalEntry {
  date: string;
  prayers: Record<string, boolean>;
}

function loadJournal(): PrayerJournalEntry[] {
  try { const raw = localStorage.getItem(LS_PRAYER_JOURNAL_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function saveJournal(journal: PrayerJournalEntry[]): void {
  try { localStorage.setItem(LS_PRAYER_JOURNAL_KEY, JSON.stringify(journal.slice(-60))); } catch {}
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calculateStreak(journal: PrayerJournalEntry[]): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = journal.find(e => e.date === key);
    if (!entry) break;
    const allPrayed = ["fajr", "dhuhr", "asr", "maghrib", "isha"].every(p => entry.prayers[p]);
    if (!allPrayed) break;
    streak++;
  }
  return streak;
}

function readStoredMethod(country: string): number {
  try {
    const v = localStorage.getItem(LS_METHOD_KEY);
    if (v !== null) return parseInt(v);
  } catch {}
  return getDefaultMethod(country);
}

function readStoredSchool(country: string): number {
  try {
    const v = localStorage.getItem(LS_SCHOOL_KEY);
    if (v !== null) return parseInt(v);
  } catch {}
  return getDefaultAsrMethod(country);
}

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

export default function PrayerTimesTab({ country }: { country: string }) {
  const { user } = useAuth();
  const [method, setMethod] = useState(() => readStoredMethod(country));
  const [school, setSchool] = useState(() => readStoredSchool(country));
  const [notifOffset, setNotifOffset] = useState(0);
  const [perPrayerNotif, setPerPrayerNotif] = useState<Record<string, boolean>>({
    fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true,
  });
  const [hasExplicitPrefs, setHasExplicitPrefs] = useState(false);
  const [muezzinId, setMuezzinId] = useState(() => getStoredMuezzinId());
  const [adhanVolume, setAdhanVolumeState] = useState(() => getAdhanVolume());
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewStopRef = useRef<(() => void) | null>(null);

  const {
    loading, error, prayers, nextPrayer, hijriDate, gregorianDate,
    countdown, lat, lng, locationSource, sunrise, sunset,
    imsak, midnight, lastThird,
  } = usePrayerTimes(country, method, school);

  const [mosques, setMosques] = useState<MosqueSummary[]>([]);
  const [mosquesLoading, setMosquesLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [journal, setJournal] = useState<PrayerJournalEntry[]>(loadJournal);
  const [showJournal, setShowJournal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchAdhanNotificationFullPrefs(user.id)
      .then((data) => {
        if (!data) return;
        setNotifEnabled(data.enabled ?? false);
        setNotifOffset(data.offset_minutes ?? 0);
        setPerPrayerNotif({
          fajr: data.fajr ?? true,
          dhuhr: data.dhuhr ?? true,
          asr: data.asr ?? true,
          maghrib: data.maghrib ?? true,
          isha: data.isha ?? true,
        });
        if (typeof data.method === "number") {
          setMethod(data.method);
          setHasExplicitPrefs(true);
          try { localStorage.setItem(LS_METHOD_KEY, String(data.method)); } catch {}
        }
        if (typeof data.asr_school === "number") {
          setSchool(data.asr_school);
          try { localStorage.setItem(LS_SCHOOL_KEY, String(data.asr_school)); } catch {}
        }
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (hasExplicitPrefs) return;
    const hasLocalMethod = localStorage.getItem(LS_METHOD_KEY) !== null;
    if (hasLocalMethod) return;
    setMethod(getDefaultMethod(country));
    setSchool(getDefaultAsrMethod(country));
  }, [country, hasExplicitPrefs]);

  const persistMethodPrefs = useCallback((newMethod: number, newSchool: number) => {
    if (!user?.id) return;
    void upsertAdhanNotificationFullPrefs(user.id, {
      enabled: notifEnabled,
      fajr: perPrayerNotif.fajr ?? true,
      dhuhr: perPrayerNotif.dhuhr ?? true,
      asr: perPrayerNotif.asr ?? true,
      maghrib: perPrayerNotif.maghrib ?? true,
      isha: perPrayerNotif.isha ?? true,
      offset_minutes: notifOffset,
      method: newMethod,
      asr_school: newSchool,
    }).catch(() => {});
  }, [user?.id, notifEnabled, perPrayerNotif, notifOffset]);

  const handleMethodChange = useCallback((value: number) => {
    setMethod(value);
    try { localStorage.setItem(LS_METHOD_KEY, String(value)); } catch {}
    persistMethodPrefs(value, school);
  }, [school, persistMethodPrefs]);

  const handleSchoolChange = useCallback((value: number) => {
    setSchool(value);
    try { localStorage.setItem(LS_SCHOOL_KEY, String(value)); } catch {}
    persistMethodPrefs(method, value);
  }, [method, persistMethodPrefs]);

  useEffect(() => {
    if (lat === null || lng === null) return;
    setMosquesLoading(true);
    fetchOSMPlaces(lat, lng, { radiusM: 3000, limit: 50 })
      .then(places => {
        const mapped: MosqueSummary[] = places
          .filter(p => p.subcategory === "mosque")
          .map(p => ({
            id: p.id, name: p.name, lat: p.lat, lng: p.lng,
            address: p.address, distanceKm: haversineKm(lat!, lng!, p.lat, p.lng),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 30);
        setMosques(mapped);
      })
      .catch(() => {})
      .finally(() => setMosquesLoading(false));
  }, [lat, lng]);

  const persistNotifPrefs = useCallback(async (
    enabled: boolean,
    offset: number,
    perPrayer: Record<string, boolean>,
  ) => {
    if (!user?.id) return;
    try {
      await upsertAdhanNotificationFullPrefs(user.id, {
        enabled,
        fajr: perPrayer.fajr ?? true,
        dhuhr: perPrayer.dhuhr ?? true,
        asr: perPrayer.asr ?? true,
        maghrib: perPrayer.maghrib ?? true,
        isha: perPrayer.isha ?? true,
        offset_minutes: offset,
      });
    } catch {
      toast.error("Erreur lors de la sauvegarde des préférences.");
    }
  }, [user?.id]);

  const toggleNotifications = useCallback(async () => {
    if (!user?.id) { toast.error("Connectez-vous pour activer les notifications."); return; }
    setNotifLoading(true);
    const newVal = !notifEnabled;
    try {
      if (newVal && "Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { toast.error("Notifications refusées par le navigateur."); setNotifLoading(false); return; }
      }
      setNotifEnabled(newVal);
      await persistNotifPrefs(newVal, notifOffset, perPrayerNotif);
      toast.success(newVal ? "Notifications adhan activées" : "Notifications adhan désactivées");
    } catch { toast.error("Erreur lors de la mise à jour."); }
    finally { setNotifLoading(false); }
  }, [user?.id, notifEnabled, notifOffset, perPrayerNotif, persistNotifPrefs]);

  const handleOffsetChange = useCallback((value: number) => {
    setNotifOffset(value);
    void persistNotifPrefs(notifEnabled, value, perPrayerNotif);
  }, [notifEnabled, perPrayerNotif, persistNotifPrefs]);

  const handlePerPrayerToggle = useCallback((prayerKey: string) => {
    setPerPrayerNotif(prev => {
      const updated = { ...prev, [prayerKey]: !(prev[prayerKey] !== false) };
      void persistNotifPrefs(notifEnabled, notifOffset, updated);
      return updated;
    });
  }, [notifEnabled, notifOffset, persistNotifPrefs]);

  const handleMuezzinChange = useCallback((id: string) => {
    if (previewStopRef.current) { previewStopRef.current(); previewStopRef.current = null; setIsPreviewPlaying(false); }
    setMuezzinId(id);
    setStoredMuezzinId(id);
    toast.success(MUEZZIN_VOICES.find(v => v.id === id)?.name ?? "Voix mise à jour");
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    setAdhanVolumeState(vol);
    setAdhanVolume(vol);
  }, []);

  const toggleAdhanPreview = useCallback(async () => {
    if (isPreviewPlaying && previewStopRef.current) {
      previewStopRef.current();
      previewStopRef.current = null;
      setIsPreviewPlaying(false);
      return;
    }
    if (muezzinId === "none") { toast("Aucune voix sélectionnée"); return; }
    setIsPreviewPlaying(true);
    const stopFn = await playAdhanPreview(muezzinId);
    previewStopRef.current = () => { stopFn(); setIsPreviewPlaying(false); };
    setTimeout(() => { setIsPreviewPlaying(false); previewStopRef.current = null; }, 15_000);
  }, [muezzinId, isPreviewPlaying]);

  useEffect(() => {
    return () => { if (previewStopRef.current) previewStopRef.current(); };
  }, []);

  const openMosqueDirections = useCallback((mosque: MosqueSummary) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`;
    window.open(url, "_blank", "noopener");
  }, []);

  const togglePrayerLogged = useCallback((prayerKey: string) => {
    const today = getTodayKey();
    setJournal(prev => {
      const existing = prev.find(e => e.date === today);
      if (existing) {
        const updated = prev.map(e => e.date === today
          ? { ...e, prayers: { ...e.prayers, [prayerKey]: !e.prayers[prayerKey] } }
          : e
        );
        saveJournal(updated);
        return updated;
      } else {
        const entry: PrayerJournalEntry = { date: today, prayers: { [prayerKey]: true } };
        const updated = [...prev, entry];
        saveJournal(updated);
        return updated;
      }
    });
  }, []);

  const todayEntry = journal.find(e => e.date === getTodayKey());
  const streak = calculateStreak(journal);
  const todayPrayedCount = todayEntry ? ["fajr", "dhuhr", "asr", "maghrib", "isha"].filter(p => todayEntry.prayers[p]).length : 0;

  const allPrayers = [
    ...(imsak ? [{ name: "Imsak", nameAr: "الإمساك", time: imsak, isNext: false, isPassed: true }] : []),
    ...(prayers || []),
    ...(sunrise ? [{ name: "Sunrise", nameAr: "الشروق", time: sunrise, isNext: false, isPassed: true }] : []),
    ...(sunset ? [{ name: "Sunset", nameAr: "الغروب", time: sunset, isNext: false, isPassed: true }] : []),
    ...(midnight ? [{ name: "Midnight", nameAr: "منتصف الليل", time: midnight, isNext: false, isPassed: true }] : []),
    ...(lastThird ? [{ name: "Tahajjud", nameAr: "التهجد", time: lastThird, isNext: false, isPassed: true }] : []),
  ].sort((a, b) => {
    const order = ["Imsak", "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Sunset", "Isha", "Midnight", "Tahajjud"];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          {gregorianDate && (
            <p className="text-xs text-muted-foreground">{gregorianDate}</p>
          )}
          {hijriDate && (
            <p className="text-xs font-semibold" style={{ color: GOLD }}>{hijriDate}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {locationSource === "gps" ? <Navigation size={10} /> : <MapPin size={10} />}
          {locationSource === "gps" ? "GPS" : country}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">
            Méthode de calcul
          </label>
          <select
            value={method}
            onChange={e => handleMethodChange(Number(e.target.value))}
            className="w-full text-xs rounded-lg border border-border bg-card px-2 py-2"
          >
            {CALCULATION_METHODS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">
            Calcul Asr
          </label>
          <select
            value={school}
            onChange={e => handleSchoolChange(Number(e.target.value))}
            className="w-full text-xs rounded-lg border border-border bg-card px-2 py-2"
          >
            {ASR_METHODS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

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

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
          <p className="text-sm text-muted-foreground">Chargement des horaires...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "hsl(var(--destructive)/0.1)", border: "1px solid hsl(var(--destructive)/0.3)" }}>
          <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && allPrayers.length > 0 && (
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wide mb-2.5" style={{ color: `${GOLD}bb` }}>
            Horaires du Jour
          </h2>
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
            {allPrayers.map(prayer => (
              <motion.div
                key={prayer.name}
                variants={fadeUp}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: prayer.isNext
                    ? `linear-gradient(135deg, ${NAVY} 0%, hsl(226 24% 18%) 100%)`
                    : prayer.isPassed ? "hsl(var(--muted)/0.4)" : "hsl(var(--card))",
                  border: prayer.isNext ? `1px solid ${GOLD}55` : "1px solid hsl(var(--border))",
                  boxShadow: prayer.isNext ? `0 0 24px ${GOLD}22` : undefined,
                }}
              >
                {prayer.isNext && (
                  <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl" style={{ background: GOLD, color: NAVY }}>
                    Prochaine
                  </div>
                )}
                <div className="flex items-center gap-4 p-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl text-2xl shrink-0"
                    style={{ background: prayer.isNext ? `${GOLD}22` : "hsl(var(--muted)/0.6)" }}>
                    {PRAYER_ICONS[prayer.name] ?? "🕌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold" style={{ color: prayer.isNext ? GOLD : prayer.isPassed ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}>
                        {prayer.name}
                      </span>
                      <span className="text-[11px]" style={{ color: prayer.isNext ? `${GOLD}99` : "hsl(var(--muted-foreground))", fontFamily: "serif" }}>
                        {prayer.nameAr}
                      </span>
                    </div>
                    {prayer.isNext && countdown && (
                      <p className="text-[11px] mt-0.5" style={{ color: `${GOLD}cc` }}>dans {countdown}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0"
                    style={{ color: prayer.isNext ? GOLD : prayer.isPassed ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}>
                    {prayer.time}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${GOLD}18` }}>
            {notifEnabled ? <Bell size={20} style={{ color: GOLD }} /> : <BellOff size={18} className="text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Notifications Adhan</p>
            <p className="text-[11px] text-muted-foreground">
              {notifEnabled ? "Rappels activés" : "Activez les rappels"}
            </p>
          </div>
          <Switch checked={notifEnabled} onCheckedChange={toggleNotifications} disabled={notifLoading} />
        </div>

        {notifEnabled && (
          <>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">
                Rappel avant la prière
              </label>
              <select
                value={notifOffset}
                onChange={e => handleOffsetChange(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-border bg-background px-2 py-2"
              >
                {NOTIFICATION_OFFSETS.map(o => (
                  <option key={o} value={o}>{o === 0 ? "À l'heure exacte" : `${o} min avant`}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map(name => {
                const key = name.toLowerCase();
                const active = perPrayerNotif[key] !== false;
                return (
                  <button
                    key={name}
                    onClick={() => handlePerPrayerToggle(key)}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-all"
                    style={{
                      background: active ? `${GOLD}22` : "hsl(var(--muted)/0.3)",
                      color: active ? GOLD : "hsl(var(--muted-foreground))",
                      border: active ? `1px solid ${GOLD}44` : "1px solid transparent",
                    }}
                  >
                    <span className="text-base">{PRAYER_ICONS[name]}</span>
                    {name}
                  </button>
                );
              })}
            </div>

            <div className="border-t pt-3 mt-1" style={{ borderColor: "hsl(var(--border))" }}>
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2 block">
                Voix du Muezzin
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {MUEZZIN_VOICES.map(voice => {
                  const isSelected = muezzinId === voice.id;
                  return (
                    <button
                      key={voice.id}
                      onClick={() => handleMuezzinChange(voice.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: isSelected ? `${GOLD}22` : "hsl(var(--muted)/0.2)",
                        border: isSelected ? `1px solid ${GOLD}55` : "1px solid transparent",
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                        style={{ background: isSelected ? `${GOLD}33` : "hsl(var(--muted)/0.4)" }}>
                        {voice.id === "none" ? <VolumeX size={14} /> : "🔊"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: isSelected ? GOLD : "hsl(var(--foreground))" }}>
                          {voice.name}
                        </p>
                        {voice.origin && (
                          <p className="text-[10px] text-muted-foreground truncate">{voice.nameAr} — {voice.origin}</p>
                        )}
                      </div>
                      {isSelected && voice.id !== "none" && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: GOLD, color: NAVY }}>
                          <span className="text-[10px] font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {muezzinId !== "none" && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAdhanPreview}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background: isPreviewPlaying ? "hsl(var(--destructive)/0.15)" : `${GOLD}22`,
                        color: isPreviewPlaying ? "hsl(var(--destructive))" : GOLD,
                        border: `1px solid ${isPreviewPlaying ? "hsl(var(--destructive)/0.3)" : `${GOLD}44`}`,
                      }}
                    >
                      {isPreviewPlaying ? <Square size={12} /> : <Play size={12} />}
                      {isPreviewPlaying ? "Arrêter" : "Écouter l'Adhan"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <VolumeX size={12} className="text-muted-foreground shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={adhanVolume}
                      onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 accent-[hsl(var(--accent))] cursor-pointer"
                    />
                    <Volume2 size={12} className="shrink-0" style={{ color: GOLD }} />
                    <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">{Math.round(adhanVolume * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!loading && lat !== null && (
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wide mb-2.5" style={{ color: `${GOLD}bb` }}>
            Mosquées Proches
          </h2>
          {mosquesLoading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Recherche...
            </div>
          )}
          {!mosquesLoading && mosques.length === 0 && (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">🕌</span>
              <p className="text-sm text-muted-foreground">Aucune mosquée dans un rayon de 3 km.</p>
            </div>
          )}
          {!mosquesLoading && mosques.length > 0 && (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
              {mosques.map(m => (
                <motion.div key={m.id} variants={fadeUp}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}>
                    <span className="text-lg">🕌</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    {m.address && <p className="text-[11px] text-muted-foreground truncate">{m.address}</p>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-bold tabular-nums" style={{ color: GOLD }}>
                        {m.distanceKm < 1 ? `${Math.round(m.distanceKm * 1000)}m` : `${m.distanceKm.toFixed(1)}km`}
                      </p>
                    </div>
                    <button
                      onClick={() => openMosqueDirections(m)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${GOLD}22` }}
                      aria-label="Itinéraire"
                    >
                      <ExternalLink size={14} style={{ color: GOLD }} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={16} style={{ color: GOLD }} />
              <p className="text-sm font-semibold">Journal de Prière</p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${GOLD}22`, color: GOLD }}>
                <Flame size={10} /> {streak} jour{streak > 1 ? "s" : ""}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">{todayPrayedCount}/5 prières enregistrées aujourd'hui</p>

          <div className="grid grid-cols-5 gap-2">
            {[
              { key: "fajr", name: "Fajr", icon: "🌙" },
              { key: "dhuhr", name: "Dhuhr", icon: "☀️" },
              { key: "asr", name: "Asr", icon: "🌤️" },
              { key: "maghrib", name: "Maghrib", icon: "🌅" },
              { key: "isha", name: "Isha", icon: "🌃" },
            ].map(p => {
              const logged = todayEntry?.prayers[p.key] ?? false;
              return (
                <button
                  key={p.key}
                  onClick={() => togglePrayerLogged(p.key)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-all"
                  style={{
                    background: logged ? "#4ade8022" : "hsl(var(--muted)/0.3)",
                    color: logged ? "#4ade80" : "hsl(var(--muted-foreground))",
                    border: logged ? "1px solid #4ade8044" : "1px solid transparent",
                  }}
                >
                  <span className="text-base">{p.icon}</span>
                  {p.name}
                  {logged && <Check size={10} />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowJournal(!showJournal)}
            className="text-[10px] font-semibold mx-auto block"
            style={{ color: GOLD }}
          >
            {showJournal ? "Masquer l'historique" : "Voir l'historique"}
          </button>

          {showJournal && journal.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {journal.slice().reverse().slice(0, 14).map(entry => {
                const count = ["fajr", "dhuhr", "asr", "maghrib", "isha"].filter(p => entry.prayers[p]).length;
                return (
                  <div key={entry.date} className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px]" style={{ background: count === 5 ? "#4ade8012" : undefined }}>
                    <span className="text-muted-foreground">{entry.date}</span>
                    <div className="flex gap-1">
                      {["fajr", "dhuhr", "asr", "maghrib", "isha"].map(p => (
                        <div key={p} className="w-3 h-3 rounded-full" style={{ background: entry.prayers[p] ? "#4ade80" : "hsl(var(--muted))" }} />
                      ))}
                    </div>
                    <span className="font-bold" style={{ color: count === 5 ? "#4ade80" : GOLD }}>{count}/5</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="text-center py-2">
        <p className="text-[10px] text-muted-foreground">
          Horaires via Al-Adhan (méthode {CALCULATION_METHODS.find(m => m.id === method)?.name ?? "ISNA"})
        </p>
      </div>
    </div>
  );
}
