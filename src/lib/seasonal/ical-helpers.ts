/**
 * ical-helpers — Pure iCal generation and parsing utilities.
 * Zero side effects. Zero UI. Pure data transformation.
 */

interface ICalBooking {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  total_price: number;
  status: string;
}

interface ICalProperty {
  id: string;
  label: string;
}

const toICalDate = (d: string) => d.replace(/-/g, "");

export function generateICalFeed(bookings: ICalBooking[], properties: ICalProperty[]): string {
  const propName = (id: string) => properties.find(p => p.id === id)?.label || "Property";
  const events = bookings.map(b => [
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${toICalDate(b.check_in)}`,
    `DTEND;VALUE=DATE:${toICalDate(b.check_out)}`,
    `SUMMARY:${b.guest_name} — ${propName(b.property_id)}`,
    `DESCRIPTION:Price: ${b.total_price} | Phone: ${b.guest_phone || "—"} | Email: ${b.guest_email || "—"}`,
    `UID:${b.id}@easy-locs`,
    `STATUS:${b.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ].join("\r\n"));

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Easy-Locs//Seasonal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Easy-Locs Seasonal",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export interface ParsedICalEvent {
  summary: string;
  start: string;
  end: string;
  uid: string;
}

export function parseICalEvents(ical: string): ParsedICalEvent[] {
  const events: ParsedICalEvent[] = [];
  const blocks = ical.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const getVal = (key: string) => {
      const match = block.match(new RegExp(`${key}[^:]*:(.+)`));
      return match ? match[1].trim() : "";
    };
    const rawStart = getVal("DTSTART");
    const rawEnd = getVal("DTEND");
    const formatDate = (d: string) => {
      const clean = d.replace(/[^0-9]/g, "").slice(0, 8);
      if (clean.length >= 8) return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
      return "";
    };
    events.push({ summary: getVal("SUMMARY"), start: formatDate(rawStart), end: formatDate(rawEnd), uid: getVal("UID") });
  }
  return events.filter(e => e.start && e.end);
}
