import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, Moon, Sun, RefreshCw, Check, X, RotateCcw } from "lucide-react";
import { getGPSOrFallback } from "@/data/islamic/fallback-coords";
import { useI18n } from "@/lib/i18n";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";

const LS_FAST_TRACKER_KEY = "islamic_ramadan_fast_tracker";
const LS_KHATMA_KEY = "islamic_ramadan_khatma";

interface RamadanDay {
  day: number;
  gregorianDate: string;
  suhoor: string;
  iftar: string;
}

interface FastStatus {
  fasted: boolean;
  missed: boolean;
  makeup: boolean;
}

interface AlAdhanGToHResponse {
  data: {
    hijri: {
      year: string;
      month: { number: string };
    };
  } | null;
}

interface AlAdhanCalendarTimings {
  Fajr: string;
  Maghrib: string;
}

interface AlAdhanCalendarDay {
  date: {
    gregorian: { date: string };
  };
  timings: AlAdhanCalendarTimings;
}

interface AlAdhanCalendarResponse {
  code: number;
  data: AlAdhanCalendarDay[] | null;
}

function cleanTime(t: string): string {
  return t?.replace(/\s*\(.*\)/, "") ?? "";
}

function getStoredMethod(): number {
  try {
    const v = localStorage.getItem("islamic_prayer_method");
    if (v !== null) return parseInt(v);
  } catch {}
  return 2;
}

function loadFastTracker(): Record<number, FastStatus> {
  try {
    const raw = localStorage.getItem(LS_FAST_TRACKER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveFastTracker(data: Record<number, FastStatus>): void {
  try { localStorage.setItem(LS_FAST_TRACKER_KEY, JSON.stringify(data)); } catch {}
}

function loadKhatma(): number {
  try {
    const raw = localStorage.getItem(LS_KHATMA_KEY);
    if (raw) return parseInt(raw) || 0;
  } catch {}
  return 0;
}

function saveKhatma(juz: number): void {
  try { localStorage.setItem(LS_KHATMA_KEY, String(juz)); } catch {}
}

export default function RamadanTab({ country }: { country: string }) {
  const { t } = useI18n();
  const prayerMethod = getStoredMethod();
  const [ramadanDays, setRamadanDays] = useState<RamadanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hijriYear, setHijriYear] = useState<number | null>(null);
  const [todayGreg, setTodayGreg] = useState("");
  const [fastTracker, setFastTracker] = useState<Record<number, FastStatus>>(loadFastTracker);
  const [khatmaJuz, setKhatmaJuz] = useState(loadKhatma);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const coords = await getGPSOrFallback(country);
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      setTodayGreg(`${dd}-${mm}-${yyyy}`);

      const gToHRes = await fetch(`https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`);
      const gToHJson: AlAdhanGToHResponse = await gToHRes.json();
      const hy = gToHJson?.data?.hijri?.year;
      if (!hy) throw new Error("no hijri year");
      const currentHijriMonth = parseInt(gToHJson?.data?.hijri?.month?.number ?? "1");
      const targetYear = currentHijriMonth > 9 ? parseInt(hy) + 1 : parseInt(hy);
      setHijriYear(targetYear);

      const calRes = await fetch(`https://api.aladhan.com/v1/hijriCalendar/${targetYear}/9?latitude=${coords.lat}&longitude=${coords.lng}&method=${prayerMethod}`);
      const calJson: AlAdhanCalendarResponse = await calRes.json();
      if (calJson.code !== 200 || !calJson.data) throw new Error("API error");
      const days: RamadanDay[] = calJson.data.map((d, i) => ({
        day: i + 1,
        gregorianDate: d.date.gregorian.date,
        suhoor: cleanTime(d.timings.Fajr),
        iftar: cleanTime(d.timings.Maghrib),
      }));
      setRamadanDays(days);
    } catch {
      setError(t("islamic.ramadan_load_error"));
    } finally {
      setLoading(false);
    }
  }, [country, prayerMethod, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFast = useCallback((day: number, type: "fasted" | "missed" | "makeup") => {
    setFastTracker(prev => {
      const current = prev[day] ?? { fasted: false, missed: false, makeup: false };
      const updated = { ...prev, [day]: { fasted: false, missed: false, makeup: false, [type]: !current[type] } };
      saveFastTracker(updated);
      return updated;
    });
  }, []);

  const incrementKhatma = useCallback(() => {
    setKhatmaJuz(prev => {
      const next = Math.min(prev + 1, 30);
      saveKhatma(next);
      return next;
    });
  }, []);

  const currentDayIndex = ramadanDays.findIndex(d => d.gregorianDate === todayGreg);
  const isRamadanNow = currentDayIndex >= 0;
  const todayData = isRamadanNow ? ramadanDays[currentDayIndex] : null;
  const progress = isRamadanNow ? ((currentDayIndex + 1) / ramadanDays.length) * 100 : 0;
  const fastedCount = Object.values(fastTracker).filter(s => s.fasted).length;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>
          {t("islamic.tab.ramadan")} {hijriYear ? `${hijriYear} H` : ""}
        </h2>
        <p className="text-xs text-muted-foreground">{t("islamic.suhoor_iftar_times")}</p>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: GOLD }} />
          <p className="text-sm text-muted-foreground">{t("islamic.loading")}</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: `${GOLD}22`, color: GOLD }}
          >
            <RefreshCw size={14} /> {t("islamic.retry")}
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {isRamadanNow && todayData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl p-5"
              style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 18%) 100%)`,
                border: `1px solid ${GOLD}44`,
                boxShadow: `0 8px 32px ${GOLD}18`,
              }}
            >
              <p className="text-center text-[0.6875rem] uppercase tracking-widest mb-3" style={{ color: `${GOLD}99` }}>
                {t("islamic.day")} {currentDayIndex + 1} / {ramadanDays.length}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <Moon size={24} className="mx-auto mb-1" style={{ color: GOLD }} />
                  <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Suhoor</p>
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: "#fff" }}>{todayData.suhoor}</p>
                </div>
                <div className="text-center">
                  <Sun size={24} className="mx-auto mb-1" style={{ color: GOLD }} />
                  <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Iftar</p>
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: "#fff" }}>{todayData.iftar}</p>
                </div>
              </div>

              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full"
                  style={{ background: GOLD }}
                />
              </div>
              <p className="text-center text-[0.625rem] mt-1" style={{ color: `${GOLD}99` }}>
                {Math.round(progress)}% {t("islamic.ramadan_completed")} · {fastedCount} {t("islamic.days_fasted")}
              </p>
            </motion.div>
          )}

          {!isRamadanNow && ramadanDays.length > 0 && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <span className="text-4xl block mb-2">🌙</span>
              <p className="text-sm font-semibold">{t("islamic.ramadan_not_active")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("islamic.next_ramadan_starts")} {ramadanDays[0]?.gregorianDate ?? "—"}
              </p>
            </div>
          )}

          <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-[0.75rem] font-bold uppercase tracking-wide" style={{ color: `${GOLD}bb` }}>
              Khatma Tracker
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(khatmaJuz / 30) * 100}%`, background: GOLD }} />
                </div>
                <p className="text-[0.625rem] text-muted-foreground mt-1">{khatmaJuz}/30 {t("islamic.juz_read")}</p>
              </div>
              <button
                onClick={incrementKhatma}
                disabled={khatmaJuz >= 30}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: `${GOLD}22`, color: GOLD }}
              >
                +1 Juz
              </button>
            </div>
          </div>

          {ramadanDays.length > 0 && (
            <div>
              <h3 className="text-[0.8125rem] font-bold uppercase tracking-wide mb-2" style={{ color: `${GOLD}bb` }}>
                {t("islamic.full_ramadan_calendar")}
              </h3>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-[0.625rem] border-collapse min-w-[500px]">
                  <thead>
                    <tr style={{ background: `${GOLD}12` }}>
                      {[t("islamic.day"), t("islamic.date"), "Suhoor", "Iftar", t("islamic.fasting")].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-bold uppercase tracking-wide" style={{ color: GOLD }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ramadanDays.map((d, i) => {
                      const isToday = i === currentDayIndex;
                      const status = fastTracker[d.day];
                      return (
                        <tr key={d.day} className="border-b border-border/30"
                          style={{ background: isToday ? `${GOLD}12` : undefined }}>
                          <td className="px-2 py-1.5 font-bold" style={{ color: isToday ? GOLD : undefined }}>
                            {d.day}{isToday ? " ●" : ""}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">{d.gregorianDate}</td>
                          <td className="px-2 py-1.5 tabular-nums">{d.suhoor}</td>
                          <td className="px-2 py-1.5 tabular-nums">{d.iftar}</td>
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleFast(d.day, "fasted")}
                                className="w-5 h-5 rounded flex items-center justify-center"
                                style={{ background: status?.fasted ? "#4ade8033" : "hsl(var(--muted)/0.3)" }}
                                title={t("islamic.fasted")}
                              >
                                <Check size={10} style={{ color: status?.fasted ? "#4ade80" : "hsl(var(--muted-foreground))" }} />
                              </button>
                              <button
                                onClick={() => toggleFast(d.day, "missed")}
                                className="w-5 h-5 rounded flex items-center justify-center"
                                style={{ background: status?.missed ? "#ef444433" : "hsl(var(--muted)/0.3)" }}
                                title={t("islamic.missed")}
                              >
                                <X size={10} style={{ color: status?.missed ? "#ef4444" : "hsl(var(--muted-foreground))" }} />
                              </button>
                              <button
                                onClick={() => toggleFast(d.day, "makeup")}
                                className="w-5 h-5 rounded flex items-center justify-center"
                                style={{ background: status?.makeup ? `${GOLD}33` : "hsl(var(--muted)/0.3)" }}
                                title={t("islamic.made_up")}
                              >
                                <RotateCcw size={8} style={{ color: status?.makeup ? GOLD : "hsl(var(--muted-foreground))" }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
