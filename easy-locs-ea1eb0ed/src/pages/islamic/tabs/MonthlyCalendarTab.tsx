import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Download } from "lucide-react";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";

interface DayTimings {
  day: number;
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface AlAdhanCalendarDay {
  date: {
    gregorian: { day: string; date: string };
  };
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
}

interface AlAdhanCalendarResponse {
  code: number;
  data: AlAdhanCalendarDay[] | null;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

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

export default function MonthlyCalendarTab({ country }: { country: string }) {
  const prayerMethod = getStoredMethod();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [days, setDays] = useState<DayTimings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
        () => {
          const COORDS: Record<string, { lat: number; lng: number }> = {
            AE: { lat: 25.2048, lng: 55.2708 }, SA: { lat: 24.7136, lng: 46.6753 },
            EG: { lat: 30.0444, lng: 31.2357 }, MA: { lat: 33.5731, lng: -7.5898 },
            FR: { lat: 48.8566, lng: 2.3522 },
          };
          const c = COORDS[country.toUpperCase()] ?? COORDS.AE;
          setLat(c.lat); setLng(c.lng);
        },
        { timeout: 5000 }
      );
    }
  }, [country]);

  useEffect(() => {
    if (lat === null || lng === null) return;
    setLoading(true);
    setError(null);

    const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=${prayerMethod}`;
    fetch(url, { signal: AbortSignal.timeout(15000) })
      .then(r => r.json())
      .then((json: AlAdhanCalendarResponse) => {
        if (json.code !== 200 || !json.data) throw new Error("Invalid response");
        const mapped: DayTimings[] = json.data.map((d) => ({
          day: parseInt(d.date.gregorian.day),
          date: d.date.gregorian.date,
          fajr: cleanTime(d.timings.Fajr),
          sunrise: cleanTime(d.timings.Sunrise),
          dhuhr: cleanTime(d.timings.Dhuhr),
          asr: cleanTime(d.timings.Asr),
          maghrib: cleanTime(d.timings.Maghrib),
          isha: cleanTime(d.timings.Isha),
        }));
        setDays(mapped);
      })
      .catch(() => setError("Impossible de charger le calendrier."))
      .finally(() => setLoading(false));
  }, [lat, lng, year, month]);

  const goMonth = useCallback((dir: -1 | 1) => {
    setMonth(prev => {
      let newMonth = prev + dir;
      if (newMonth < 1) { setYear(y => y - 1); return 12; }
      if (newMonth > 12) { setYear(y => y + 1); return 1; }
      return newMonth;
    });
  }, []);

  const exportCSV = useCallback(() => {
    if (days.length === 0) return;
    const header = "Jour,Date,Fajr,Lever du soleil,Dhuhr,Asr,Maghrib,Isha";
    const rows = days.map(d =>
      `${d.day},${d.date},${d.fajr},${d.sunrise},${d.dhuhr},${d.asr},${d.maghrib},${d.isha}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prieres_${MONTHS_FR[month - 1]}_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [days, month, year]);

  const today = new Date().getDate();
  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => goMonth(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
          <ChevronLeft size={18} style={{ color: GOLD }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: GOLD }}>
          {MONTHS_FR[month - 1]} {year}
        </h2>
        <button onClick={() => goMonth(1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
          <ChevronRight size={18} style={{ color: GOLD }} />
        </button>
      </div>

      {!loading && !error && days.length > 0 && (
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}33` }}
        >
          <Download size={14} />
          Exporter CSV
        </button>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: GOLD }} />
          <p className="text-sm text-muted-foreground">Chargement du calendrier...</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && days.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-[10px] border-collapse min-w-[600px]">
            <thead>
              <tr style={{ background: `${GOLD}12` }}>
                {["Jour", "Fajr", "Lever", "Dhuhr", "Asr", "Maghrib", "Isha"].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-bold uppercase tracking-wide" style={{ color: GOLD }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(d => {
                const isToday = isCurrentMonth && d.day === today;
                return (
                  <tr
                    key={d.day}
                    className="border-b border-border/30"
                    style={{ background: isToday ? `${GOLD}12` : undefined }}
                  >
                    <td className="px-2 py-1.5 font-bold" style={{ color: isToday ? GOLD : undefined }}>
                      {d.day}{isToday ? " ●" : ""}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{d.fajr}</td>
                    <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{d.sunrise}</td>
                    <td className="px-2 py-1.5 tabular-nums">{d.dhuhr}</td>
                    <td className="px-2 py-1.5 tabular-nums">{d.asr}</td>
                    <td className="px-2 py-1.5 tabular-nums">{d.maghrib}</td>
                    <td className="px-2 py-1.5 tabular-nums">{d.isha}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
