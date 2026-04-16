import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Bell, BellOff, Navigation, Clock, AlertTriangle, Loader2, MapPin, ExternalLink,
  Volume2, VolumeX, Play, Square, Check, Flame, Smartphone,
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
import {
  isPushSupported,
  ensurePushRegistered,
  getPushPermissionState,
} from "@/lib/push/prayer-push-scheduler";
import { dispatchPrayerPrefsChanged } from "@/hooks/usePrayerNotifications";
import { useI18n } from "@/lib/i18n";

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
  const { t, locale } = useI18n();
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
  const [pushState, setPushState] = useState<"idle" | "registering" | "registered" | "denied" | "unsupported">("idle");
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
      toast.error(t("islamic.error_saving_prefs"));
    }
  }, [user?.id, t]);

  useEffect(() => {
    if (!notifEnabled) return;
    if (!isPushSupported()) {
      setPushState("unsupported");
      return;
    }
    getPushPermissionState().then((state) => {
      if (state === "granted") setPushState("registered");
      else if (state === "denied") setPushState("denied");
    });
  }, [notifEnabled]);

  const handleEnablePush = useCallback(async () => {
    if (!user?.id) return;
    setPushState("registering");
    try {
      const registered = await ensurePushRegistered(user?.id);
      setPushState(registered ? "registered" : "denied");
      if (registered) {
        toast.success("Notifications push activées — vous serez alerté même en arrière-plan");
      } else {
        toast.error("Impossible d'activer les notifications push");
      }
    } catch {
      setPushState("denied");
      toast.error("Erreur lors de l'activation push");
    }
  }, [user?.id]);

  const toggleNotifications = useCallback(async () => {
    if (!user?.id) { toast.error(t("islamic.login_for_notifications")); return; }
    setNotifLoading(true);
    const newVal = !notifEnabled;
    try {
      if (newVal && "Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { toast.error(t("islamic.notifications_denied")); setNotifLoading(false); return; }
      }
      setNotifEnabled(newVal);
      await persistNotifPrefs(newVal, notifOffset, perPrayerNotif);
      dispatchPrayerPrefsChanged();
      toast.success(newVal ? t("islamic.adhan_notifications_on") : t("islamic.adhan_notifications_off"));

      if (newVal && isPushSupported()) {
        const pushPerm = await getPushPermissionState();
        if (pushPerm === "granted") {
          ensurePushRegistered(user?.id).then((r) => setPushState(r ? "registered" : "idle"));
        }
      }
    } catch { toast.error(t("islamic.error_updating")); }
    finally { setNotifLoading(false); }
  }, [user?.id, notifEnabled, notifOffset, perPrayerNotif, persistNotifPrefs, t]);

  const handleOffsetChange = useCallback((value: number) => {
    setNotifOffset(value);
    void persistNotifPrefs(notifEnabled, value, perPrayerNotif).then(() => dispatchPrayerPrefsChanged());
  }, [notifEnabled, perPrayerNotif, persistNotifPrefs]);

  const handlePerPrayerToggle = useCallback((prayerKey: string) => {
    setPerPrayerNotif(prev => {
      const updated = { ...prev, [prayerKey]: !(prev[prayerKey] !== false) };
      void persistNotifPrefs(notifEnabled, notifOffset, updated).then(() => dispatchPrayerPrefsChanged());
      return updated;
    });
  }, [notifEnabled, notifOffset, persistNotifPrefs]);

  const handleMuezzinChange = useCallback((id: string) => {
    if (previewStopRef.current) { previewStopRef.current(); previewStopRef.current = null; setIsPreviewPlaying(false); }
    setMuezzinId(id);
    setStoredMuezzinId(id);
    toast.success(MUEZZIN_VOICES.find(v => v.id === id)?.name ?? t("islamic.voice_updated"));
  }, [t]);

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
    if (muezzinId === "none") { toast(t("islamic.no_voice_selected")); return; }
    setIsPreviewPlaying(true);
    const stopFn = await playAdhanPreview(muezzinId);
    previewStopRef.current = () => { stopFn(); setIsPreviewPlaying(false); };
    setTimeout(() => { setIsPreviewPlaying(false); previewStopRef.current = null; }, 15_000);
  }, [muezzinId, isPreviewPlaying, t]);

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
        <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
          {locationSource === "gps" ? <Navigation size={10} /> : <MapPin size={10} />}
          {locationSource === "gps" ? "GPS" : country}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">
            {t("islamic.calculation_method")}
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
          <label className="text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">
            {t("islamic.asr_calculation")}
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
          <p className="text-[0.6875rem] uppercase tracking-widest mb-1" style={{ color: `${GOLD}99` }}>
            {t("islamic.next_prayer")}
          </p>
          <p className="text-2xl font-bold mb-1" style={{ color: GOLD }}>{nextPrayer.name}</p>
          <p className="text-3xl font-extrabold tabular-nums mb-2" style={{ color: "#fff" }}>
            {nextPrayer.time}
          </p>
          {countdown && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-semibold"
              style={{ background: `${GOLD}22`, color: GOLD }}
            >
              <Clock size={12} />
              {t("islamic.in_time")} {countdown}
            </div>
          )}
        </motion.div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
          <p className="text-sm text-muted-foreground">{t("islamic.loading_times")}</p>
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
          <h2 className="text-[0.8125rem] font-bold uppercase tracking-wide mb-2.5" style={{ color: `${GOLD}bb` }}>
            {t("islamic.today_times")}
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
                  <div className="absolute top-0 right-0 px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest rounded-bl-xl" style={{ background: GOLD, color: NAVY }}>
                    {t("islamic.next")}
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
                      <span className="text-[0.6875rem]" style={{ color: prayer.isNext ? `${GOLD}99` : "hsl(var(--muted-foreground))", fontFamily: "serif" }}>
                        {prayer.nameAr}
                      </span>
                    </div>
                    {prayer.isNext && countdown && (
                      <p className="text-[0.6875rem] mt-0.5" style={{ color: `${GOLD}cc` }}>{t("islamic.in_time")} {countdown}</p>
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
            <p className="text-sm font-semibold">{t("islamic.adhan_notifications")}</p>
            <p className="text-[0.6875rem] text-muted-foreground">
              {notifEnabled ? t("islamic.reminders_enabled") : t("islamic.enable_reminders")}
            </p>
          </div>
          <Switch checked={notifEnabled} onCheckedChange={toggleNotifications} disabled={notifLoading} />
        </div>

        {notifEnabled && (
          <>
            <div>
              <label className="text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">
                {t("islamic.reminder_before_prayer")}
              </label>
              <select
                value={notifOffset}
                onChange={e => handleOffsetChange(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-border bg-background px-2 py-2"
              >
                {NOTIFICATION_OFFSETS.map(o => (
                  <option key={o} value={o}>{o === 0 ? t("islamic.at_exact_time") : `${o} min ${t("islamic.before")}`}</option>
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
                    className="flex flex-col items-center gap-1 py-2 rounded-xl text-[0.625rem] font-semibold transition-all"
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

            {isPushSupported() && pushState !== "registered" && pushState !== "unsupported" && (
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: pushState === "denied" ? "hsl(var(--destructive)/0.08)" : `${GOLD}0d`,
                  border: pushState === "denied" ? "1px solid hsl(var(--destructive)/0.2)" : `1px solid ${GOLD}33`,
                }}
              >
                <Smartphone size={18} style={{ color: pushState === "denied" ? "hsl(var(--destructive))" : GOLD }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6875rem] font-semibold">
                    {pushState === "denied" ? "Notifications push bloquées" : "Notifications en arrière-plan"}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {pushState === "denied"
                      ? "Autorisez les notifications dans les paramètres du navigateur"
                      : "Recevez les alertes même quand l'app est fermée"}
                  </p>
                </div>
                {pushState !== "denied" && (
                  <button
                    onClick={handleEnablePush}
                    disabled={pushState === "registering"}
                    className="px-3 py-1.5 rounded-lg text-[0.625rem] font-bold shrink-0 transition-all"
                    style={{ background: GOLD, color: NAVY }}
                  >
                    {pushState === "registering" ? "..." : "Activer"}
                  </button>
                )}
              </div>
            )}

            {pushState === "registered" && (
              <div
                className="rounded-xl p-2.5 flex items-center gap-2"
                style={{ background: "hsl(142 71% 45% / 0.08)", border: "1px solid hsl(142 71% 45% / 0.2)" }}
              >
                <Check size={14} style={{ color: "hsl(142 71% 45%)" }} className="shrink-0" />
                <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(142 71% 45%)" }}>
                  Notifications push actives — alertes même en arrière-plan
                </p>
              </div>
            )}

            <div className="border-t pt-3 mt-1" style={{ borderColor: "hsl(var(--border))" }}>
              <label className="text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground mb-2 block">
                {t("islamic.muezzin_voice")}
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
                          <p className="text-[0.625rem] text-muted-foreground truncate">{voice.origin}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="shrink-0">
                          <Check size={14} style={{ color: GOLD }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={toggleAdhanPreview}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: `${GOLD}22`, color: GOLD }}
                >
                  {isPreviewPlaying ? <Square size={12} /> : <Play size={12} />}
                  {isPreviewPlaying ? t("islamic.stop") : t("islamic.preview")}
                </button>

                <div className="flex items-center gap-2 flex-1">
                  <Volume2 size={14} style={{ color: `${GOLD}88` }} />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={adhanVolume}
                    onChange={e => handleVolumeChange(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-[0.625rem] font-semibold tabular-nums" style={{ color: `${GOLD}88` }}>{adhanVolume}%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
