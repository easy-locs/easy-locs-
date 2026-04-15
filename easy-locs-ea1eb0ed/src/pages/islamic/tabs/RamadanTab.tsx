import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Moon, Sun } from "lucide-react";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";

interface RamadanDay {
  day: number;
  gregorianDate: string;
  suhoor: string;
  iftar: string;
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

export default function RamadanTab({ country }: { country: string }) {
  const prayerMethod = getStoredMethod();
  const [ramadanDays, setRamadanDays] = useState<RamadanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hijriYear, setHijriYear] = useState<number | null>(null);
  const [todayGreg, setTodayGreg] = useState("");

  useEffect(() => {
    const COORDS: Record<string, { lat: number; lng: number }> = {
      AE: { lat: 25.2048, lng: 55.2708 }, SA: { lat: 24.7136, lng: 46.6753 },
      EG: { lat: 30.0444, lng: 31.2357 }, MA: { lat: 33.5731, lng: -7.5898 },
      FR: { lat: 48.8566, lng: 2.3522 }, PK: { lat: 33.6844, lng: 73.0479 },
      TR: { lat: 39.9334, lng: 32.8597 }, ID: { lat: -6.2088, lng: 106.8456 },
    };
    const c = COORDS[country.toUpperCase()] ?? COORDS.AE;

    setLoading(true);
    setError(null);

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    setTodayGreg(`${dd}-${mm}-${yyyy}`);

    fetch(`https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`)
      .then(r => r.json())
      .then((json: AlAdhanGToHResponse) => {
        const hy = json?.data?.hijri?.year;
        if (!hy) throw new Error("no hijri year");
        const currentHijriMonth = parseInt(json?.data?.hijri?.month?.number ?? "1");
        const targetYear = currentHijriMonth > 9 ? parseInt(hy) + 1 : parseInt(hy);
        setHijriYear(targetYear);

        return fetch(`https://api.aladhan.com/v1/hijriCalendar/${targetYear}/9?latitude=${c.lat}&longitude=${c.lng}&method=${prayerMethod}`);
      })
      .then(r => r.json())
      .then((json: AlAdhanCalendarResponse) => {
        if (json.code !== 200 || !json.data) throw new Error("API error");
        const days: RamadanDay[] = json.data.map((d, i) => ({
          day: i + 1,
          gregorianDate: d.date.gregorian.date,
          suhoor: cleanTime(d.timings.Fajr),
          iftar: cleanTime(d.timings.Maghrib),
        }));
        setRamadanDays(days);
      })
      .catch(() => setError("Impossible de charger les horaires du Ramadan."))
      .finally(() => setLoading(false));
  }, [country]);

  const currentDayIndex = ramadanDays.findIndex(d => d.gregorianDate === todayGreg);
  const isRamadanNow = currentDayIndex >= 0;
  const todayData = isRamadanNow ? ramadanDays[currentDayIndex] : null;
  const progress = isRamadanNow ? ((currentDayIndex + 1) / ramadanDays.length) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>
          Ramadan {hijriYear ? `${hijriYear} H` : ""}
        </h2>
        <p className="text-xs text-muted-foreground">Horaires Suhoor & Iftar</p>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: GOLD }} />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-destructive">{error}</p>
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
              <p className="text-center text-[11px] uppercase tracking-widest mb-3" style={{ color: `${GOLD}99` }}>
                Jour {currentDayIndex + 1} / {ramadanDays.length}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <Moon size={24} className="mx-auto mb-1" style={{ color: GOLD }} />
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Suhoor</p>
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: "#fff" }}>{todayData.suhoor}</p>
                </div>
                <div className="text-center">
                  <Sun size={24} className="mx-auto mb-1" style={{ color: GOLD }} />
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Iftar</p>
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
              <p className="text-center text-[10px] mt-1" style={{ color: `${GOLD}99` }}>
                {Math.round(progress)}% du Ramadan accompli
              </p>
            </motion.div>
          )}

          {!isRamadanNow && ramadanDays.length > 0 && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <span className="text-4xl block mb-2">🌙</span>
              <p className="text-sm font-semibold">Le Ramadan n'est pas en cours</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prochain Ramadan commence le {ramadanDays[0]?.gregorianDate ?? "—"}
              </p>
            </div>
          )}

          {ramadanDays.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color: `${GOLD}bb` }}>
                Calendrier complet du Ramadan
              </h3>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-[10px] border-collapse min-w-[400px]">
                  <thead>
                    <tr style={{ background: `${GOLD}12` }}>
                      {["Jour", "Date", "Suhoor (Fajr)", "Iftar (Maghrib)"].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-bold uppercase tracking-wide" style={{ color: GOLD }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ramadanDays.map((d, i) => {
                      const isToday = i === currentDayIndex;
                      return (
                        <tr key={d.day} className="border-b border-border/30"
                          style={{ background: isToday ? `${GOLD}12` : undefined }}>
                          <td className="px-2 py-1.5 font-bold" style={{ color: isToday ? GOLD : undefined }}>
                            {d.day}{isToday ? " ●" : ""}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">{d.gregorianDate}</td>
                          <td className="px-2 py-1.5 tabular-nums">{d.suhoor}</td>
                          <td className="px-2 py-1.5 tabular-nums">{d.iftar}</td>
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
