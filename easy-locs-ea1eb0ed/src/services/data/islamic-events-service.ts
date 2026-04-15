interface IslamicEventDate {
  id: string;
  name: string;
  hijriMonth: number;
  hijriDay: number;
  gregorianStart: string;
  gregorianEnd: string;
}

interface CachedIslamicEvents {
  events: IslamicEventDate[];
  year: number;
  fetchedAt: number;
}

interface AlAdhanGToHResponse {
  data: {
    hijri: {
      year: string;
    };
  } | null;
}

interface AlAdhanCalendarDay {
  date: {
    hijri: { day: string };
    gregorian: {
      year: string;
      month: { number: number };
      day: string;
    };
  };
}

interface AlAdhanCalendarResponse {
  code: number;
  data: AlAdhanCalendarDay[] | null;
}

let _cachedEvents: CachedIslamicEvents | null = null;

async function fetchHijriMonthDates(hijriYear: number, hijriMonth: number): Promise<{ day: number; gregorian: string }[]> {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/hijriCalendar/${hijriYear}/${hijriMonth}?latitude=25.2048&longitude=55.2708&method=2`, {
      signal: AbortSignal.timeout(10000),
    });
    const json: AlAdhanCalendarResponse = await res.json();
    if (json.code !== 200 || !json.data) return [];
    return json.data.map((d) => ({
      day: parseInt(d.date.hijri.day),
      gregorian: `${d.date.gregorian.year}-${String(d.date.gregorian.month.number).padStart(2, "0")}-${String(d.date.gregorian.day).padStart(2, "0")}`,
    }));
  } catch {
    return [];
  }
}

export async function getIslamicEventDates(): Promise<IslamicEventDate[]> {
  const now = new Date();
  const currentYear = now.getFullYear();

  if (_cachedEvents && _cachedEvents.year === currentYear && Date.now() - _cachedEvents.fetchedAt < 86_400_000) {
    return _cachedEvents.events;
  }

  try {
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const res = await fetch(`https://api.aladhan.com/v1/gToH/${dd}-${mm}-${currentYear}`);
    const json: AlAdhanGToHResponse = await res.json();
    const hijriYear = parseInt(json?.data?.hijri?.year ?? "1448");

    const ramadanDates = await fetchHijriMonthDates(hijriYear, 9);
    const shawwalDates = await fetchHijriMonthDates(hijriYear, 10);
    const dhulHijjahDates = await fetchHijriMonthDates(hijriYear, 12);

    const events: IslamicEventDate[] = [];

    if (ramadanDates.length > 0) {
      events.push({
        id: "ramadan",
        name: "Ramadan",
        hijriMonth: 9,
        hijriDay: 1,
        gregorianStart: ramadanDates[0].gregorian,
        gregorianEnd: ramadanDates[ramadanDates.length - 1].gregorian,
      });
    }

    const eidFitrDays = shawwalDates.filter(d => d.day >= 1 && d.day <= 3);
    if (eidFitrDays.length > 0) {
      events.push({
        id: "eid_fitr",
        name: "Eid al-Fitr",
        hijriMonth: 10,
        hijriDay: 1,
        gregorianStart: eidFitrDays[0].gregorian,
        gregorianEnd: eidFitrDays[eidFitrDays.length - 1].gregorian,
      });
    }

    const eidAdhaDays = dhulHijjahDates.filter(d => d.day >= 10 && d.day <= 13);
    if (eidAdhaDays.length > 0) {
      events.push({
        id: "eid_adha",
        name: "Eid al-Adha",
        hijriMonth: 12,
        hijriDay: 10,
        gregorianStart: eidAdhaDays[0].gregorian,
        gregorianEnd: eidAdhaDays[eidAdhaDays.length - 1].gregorian,
      });
    }

    _cachedEvents = { events, year: currentYear, fetchedAt: Date.now() };
    return events;
  } catch {
    return [];
  }
}

export function isDateInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

export function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
