import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { HIJRI_EVENTS, HIJRI_MONTHS } from "@/data/islamic/hijri-events";

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

export default function HijriCalendarTab() {
  const [hijriMonth, setHijriMonth] = useState<number>(1);
  const [hijriYear, setHijriYear] = useState<number>(1448);
  const [days, setDays] = useState<HijriDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

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

  useEffect(() => {
    if (!initialized) return;
    setLoading(true);
    fetch(`https://api.aladhan.com/v1/hijriCalendar/${hijriYear}/${hijriMonth}?latitude=25.2048&longitude=55.2708&method=2`)
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
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [hijriMonth, hijriYear, initialized]);

  const goMonth = useCallback((dir: -1 | 1) => {
    setHijriMonth(prev => {
      let nm = prev + dir;
      if (nm < 1) { setHijriYear(y => y - 1); return 12; }
      if (nm > 12) { setHijriYear(y => y + 1); return 1; }
      return nm;
    });
  }, []);

  const monthEvents = HIJRI_EVENTS.filter(e => e.month === hijriMonth);
  const monthName = HIJRI_MONTHS.find(m => m.number === hijriMonth);
  const todayGreg = new Date();
  const todayStr = `${todayGreg.getDate()}/${todayGreg.getMonth() + 1}/${todayGreg.getFullYear()}`;

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
            <div key={ev.day} className="flex items-center gap-3 p-3 rounded-2xl"
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

      {!loading && days.length > 0 && (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS_FR.map(wd => (
            <div key={wd} className="text-center text-[9px] font-bold uppercase text-muted-foreground py-1">
              {wd}
            </div>
          ))}

          {(() => {
            const firstDayOfWeek = WEEKDAYS_FR.indexOf(days[0]?.weekday ?? "Lun");
            const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div key={`blank-${i}`} />
            ));
            return blanks;
          })()}

          {days.map(d => {
            const isToday = d.gregorianDate === todayStr;
            const hasEvent = HIJRI_EVENTS.some(e => e.month === d.hijriMonth && e.day === d.hijriDay);
            return (
              <div
                key={d.hijriDay}
                className="text-center py-1.5 rounded-lg relative"
                style={{
                  background: isToday ? GOLD : hasEvent ? `${GOLD}18` : undefined,
                  color: isToday ? "hsl(226 22% 14%)" : undefined,
                }}
              >
                <p className="text-xs font-bold">{d.hijriDay}</p>
                <p className="text-[8px] text-muted-foreground" style={{ color: isToday ? "hsl(226 22% 14% / 0.7)" : undefined }}>
                  {d.gregorianDay}
                </p>
                {hasEvent && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: GOLD }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
