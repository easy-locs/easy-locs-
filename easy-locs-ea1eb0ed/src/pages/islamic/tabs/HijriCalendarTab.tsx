import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, ArrowLeftRight } from "lucide-react";
import { HIJRI_EVENTS, HIJRI_MONTHS } from "@/data/islamic/hijri-events";
import { getFallbackCoords } from "@/data/islamic/fallback-coords";

const GOLD = "hsl(var(--accent))";

interface HijriDay {
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  gregorianDate: string;
  gregorianDay: number;
  weekday: string;
}

interface AlAdhanGToHResponse {
  data: {
    hijri: {
      month: { number: number };
      year: string;
    };
  };
}

interface AlAdhanCalendarDay {
  date: {
    hijri: {
      day: string;
      month: { number: number };
      year: string;
    };
    gregorian: {
      day: string;
      month: { number: number };
      year: string;
    };
  };
}

interface AlAdhanCalendarResponse {
  code: number;
  data: AlAdhanCalendarDay[] | null;
}

const WEEKDAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function isSunnahFastDay(weekday: string, hijriDay: number): boolean {
  if (weekday === "Lun" || weekday === "Jeu") return true;
  if (hijriDay === 13 || hijriDay === 14 || hijriDay === 15) return true;
  return false;
}

export default function HijriCalendarTab() {
  const [hijriMonth, setHijriMonth] = useState<number>(1);
  const [hijriYear, setHijriYear] = useState<number>(1448);
  const [days, setDays] = useState<HijriDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [selectedDay, setSelectedDay] = useState<HijriDay | null>(null);
  const [converterGreg, setConverterGreg] = useState("");
  const [converterResult, setConverterResult] = useState("");
  const [showConverter, setShowConverter] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { const fb = getFallbackCoords("AE"); setCoords({ lat: fb.lat, lng: fb.lng }); },
        { timeout: 5000 }
      );
    } else {
      const fb = getFallbackCoords("AE");
      setCoords({ lat: fb.lat, lng: fb.lng });
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    fetch(`https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`)
      .then(r => r.json())
      .then((json: AlAdhanGToHResponse) => {
        if (json?.data?.hijri) {
          setHijriMonth(json.data.hijri.month.number);
          setHijriYear(parseInt(json.data.hijri.year));
        }
        setInitialized(true);
      })
      .catch(() => setInitialized(true));
  }, []);

  const fetchCalendar = useCallback(() => {
    if (!initialized || !coords) return;
    setLoading(true);
    setError(null);
    fetch(`https://api.aladhan.com/v1/hijriCalendar/${hijriYear}/${hijriMonth}?latitude=${coords.lat}&longitude=${coords.lng}&method=2`)
      .then(r => r.json())
      .then((json: AlAdhanCalendarResponse) => {
        if (json.code !== 200 || !json.data) throw new Error("err");
        const mapped: HijriDay[] = json.data.map((d) => {
          const gDate = new Date(
            parseInt(d.date.gregorian.year),
            d.date.gregorian.month.number - 1,
            parseInt(d.date.gregorian.day)
          );
          return {
            hijriDay: parseInt(d.date.hijri.day),
            hijriMonth: d.date.hijri.month.number,
            hijriYear: parseInt(d.date.hijri.year),
            gregorianDate: `${d.date.gregorian.day}/${d.date.gregorian.month.number}/${d.date.gregorian.year}`,
            gregorianDay: parseInt(d.date.gregorian.day),
            weekday: WEEKDAYS_FR[gDate.getDay()],
          };
        });
        setDays(mapped);
      })
      .catch(() => {
        setError("Impossible de charger le calendrier.");
        setDays([]);
      })
      .finally(() => setLoading(false));
  }, [hijriMonth, hijriYear, initialized, coords]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const goMonth = useCallback((dir: -1 | 1) => {
    setHijriMonth(prev => {
      let nm = prev + dir;
      if (nm < 1) { setHijriYear(y => y - 1); return 12; }
      if (nm > 12) { setHijriYear(y => y + 1); return 1; }
      return nm;
    });
    setSelectedDay(null);
  }, []);

  const convertDate = useCallback(async () => {
    if (!converterGreg) return;
    try {
      const res = await fetch(`https://api.aladhan.com/v1/gToH/${converterGreg}`);
      const json = await res.json();
      if (json?.data?.hijri) {
        const h = json.data.hijri;
        const monthName = HIJRI_MONTHS.find(m => m.number === parseInt(h.month.number))?.name ?? h.month.number;
        setConverterResult(`${h.day} ${monthName} ${h.year} H`);
      }
    } catch {
      setConverterResult("Erreur de conversion");
    }
  }, [converterGreg]);

  const monthEvents = HIJRI_EVENTS.filter(e => e.month === hijriMonth);
  const monthName = HIJRI_MONTHS.find(m => m.number === hijriMonth);
  const todayGreg = new Date();
  const todayStr = `${todayGreg.getDate()}/${todayGreg.getMonth() + 1}/${todayGreg.getFullYear()}`;
  const selectedDayEvents = selectedDay ? HIJRI_EVENTS.filter(e => e.month === selectedDay.hijriMonth && e.day === selectedDay.hijriDay) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => goMonth(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
          <ChevronLeft size={18} style={{ color: GOLD }} />
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold" style={{ color: GOLD }}>
            {monthName?.name ?? `Mois ${hijriMonth}`}
          </h2>
          <p className="text-xs text-muted-foreground" dir="rtl">
            {monthName?.nameAr} {hijriYear}
          </p>
        </div>
        <button onClick={() => goMonth(1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
          <ChevronRight size={18} style={{ color: GOLD }} />
        </button>
      </div>

      {monthEvents.length > 0 && (
        <div className="space-y-2">
          {monthEvents.map(ev => (
            <div key={`${ev.month}-${ev.day}`} className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}33` }}>
              <span className="text-2xl">{ev.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: GOLD }}>{ev.name}</p>
                <p className="text-[10px] text-muted-foreground">{ev.description} — {ev.day} {monthName?.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={24} className="animate-spin" style={{ color: GOLD }} />
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={fetchCalendar} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: `${GOLD}22`, color: GOLD }}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}

      {!loading && days.length > 0 && (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS_FR.map(wd => (
            <div key={wd} className="text-center text-[9px] font-bold uppercase text-muted-foreground py-1">
              {wd}
            </div>
          ))}

          {(() => {
            const firstDayOfWeek = WEEKDAYS_FR.indexOf(days[0]?.weekday ?? "Lun");
            return Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`blank-${i}`} />);
          })()}

          {days.map(d => {
            const isToday = d.gregorianDate === todayStr;
            const hasEvent = HIJRI_EVENTS.some(e => e.month === d.hijriMonth && e.day === d.hijriDay);
            const isSunnah = isSunnahFastDay(d.weekday, d.hijriDay);
            const isSelected = selectedDay?.hijriDay === d.hijriDay;
            return (
              <button
                key={d.hijriDay}
                onClick={() => setSelectedDay(isSelected ? null : d)}
                className="text-center py-1.5 rounded-lg relative transition-all"
                style={{
                  background: isToday ? GOLD : isSelected ? `${GOLD}33` : hasEvent ? `${GOLD}18` : undefined,
                  color: isToday ? "hsl(226 22% 14%)" : undefined,
                  border: isSunnah && !isToday ? `1px dashed ${GOLD}44` : undefined,
                }}
              >
                <p className="text-xs font-bold">{d.hijriDay}</p>
                <p className="text-[8px] text-muted-foreground" style={{ color: isToday ? "hsl(226 22% 14% / 0.7)" : undefined }}>
                  {d.gregorianDay}
                </p>
                {hasEvent && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: GOLD }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedDay && (
        <div className="rounded-2xl p-4 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-sm font-bold" style={{ color: GOLD }}>
            {selectedDay.hijriDay} {monthName?.name} {selectedDay.hijriYear} H
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedDay.gregorianDate} ({selectedDay.weekday})
          </p>
          {selectedDayEvents.length > 0 && selectedDayEvents.map(ev => (
            <div key={ev.name} className="flex items-center gap-2 pt-1">
              <span>{ev.emoji}</span>
              <div>
                <p className="text-xs font-semibold">{ev.name}</p>
                <p className="text-[10px] text-muted-foreground">{ev.description}</p>
              </div>
            </div>
          ))}
          {isSunnahFastDay(selectedDay.weekday, selectedDay.hijriDay) && (
            <p className="text-[10px] font-semibold" style={{ color: GOLD }}>
              Jour de jeûne sunnah recommandé
            </p>
          )}
        </div>
      )}

      <div className="flex justify-center gap-4 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} /> Événement
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ border: `1px dashed ${GOLD}66` }} /> Jeûne sunnah
        </span>
      </div>

      <button
        onClick={() => setShowConverter(!showConverter)}
        className="flex items-center gap-2 mx-auto text-xs font-semibold"
        style={{ color: GOLD }}
      >
        <ArrowLeftRight size={14} />
        Convertir une date
      </button>

      {showConverter && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-xs font-semibold">Grégorien → Hijri</p>
          <input
            type="text"
            value={converterGreg}
            onChange={e => setConverterGreg(e.target.value)}
            placeholder="JJ-MM-AAAA (ex: 15-04-2026)"
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
          />
          <button
            onClick={convertDate}
            className="w-full py-2 rounded-xl text-xs font-semibold"
            style={{ background: `${GOLD}22`, color: GOLD }}
          >
            Convertir
          </button>
          {converterResult && (
            <p className="text-sm font-bold text-center" style={{ color: GOLD }}>{converterResult}</p>
          )}
        </div>
      )}
    </div>
  );
}
