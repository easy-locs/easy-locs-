/**
 * useICalService — Atomic: iCal import/export for seasonal bookings.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  total_price: number;
  cleaning_fee: number;
  deposit_amount: number;
  status: string;
  notes: string;
}

interface Property { id: string; label: string; }

const toICalDate = (d: string) => d.replace(/-/g, "");

function generateICalFeed(bookings: Booking[], properties: Property[]) {
  const propName = (id: string) => properties.find((p) => p.id === id)?.label || "Property";
  const events = bookings.map((b) => [
    "BEGIN:VEVENT", `DTSTART;VALUE=DATE:${toICalDate(b.check_in)}`, `DTEND;VALUE=DATE:${toICalDate(b.check_out)}`,
    `SUMMARY:${b.guest_name} — ${propName(b.property_id)}`,
    `DESCRIPTION:Price: ${b.total_price} | Phone: ${b.guest_phone || "—"} | Email: ${b.guest_email || "—"}`,
    `UID:${b.id}@easy-locs`, `STATUS:${b.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT",
  ].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Easy-Locs//Seasonal//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Easy-Locs Seasonal", ...events, "END:VCALENDAR"].join("\r\n");
}

function parseICalEvents(ical: string) {
  const events: { summary: string; start: string; end: string; uid: string }[] = [];
  const blocks = ical.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const getVal = (key: string) => { const m = block.match(new RegExp(`${key}[^:]*:(.+)`)); return m ? m[1].trim() : ""; };
    const fmt = (d: string) => { const c = d.replace(/[^0-9]/g, "").slice(0, 8); return c.length >= 8 ? `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}` : ""; };
    events.push({ summary: getVal("SUMMARY"), start: fmt(getVal("DTSTART")), end: fmt(getVal("DTEND")), uid: getVal("UID") });
  }
  return events.filter((e) => e.start && e.end);
}

export function useICalService(orgId: string | null, userId: string | undefined) {
  const [importing, setImporting] = useState(false);

  const exportIcal = useCallback((bookings: Booking[], properties: Property[]) => {
    const ical = generateICalFeed(bookings, properties);
    const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "easy-locs-saisonnier.ics"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const copyIcalContent = useCallback((bookings: Booking[], properties: Property[]) => {
    const ical = generateICalFeed(bookings, properties);
    navigator.clipboard.writeText(ical);
  }, []);

  const importFromUrl = useCallback(async (url: string, bookings: Booking[], defaultPropertyId: string): Promise<number> => {
    if (!orgId || !userId) return 0;
    setImporting(true);
    try {
      const res = await fetch(url);
      const icalText = await res.text();
      const events = parseICalEvents(icalText);
      if (events.length === 0) return 0;
      const existingDates = new Set(bookings.map((b) => `${b.check_in}-${b.check_out}-${b.guest_name}`));
      const newBookings = events.filter((e) => !existingDates.has(`${e.start}-${e.end}-${e.summary}`)).map((e) => ({
        org_id: orgId, user_id: userId, property_id: defaultPropertyId,
        guest_name: e.summary || "Imported guest", check_in: e.start, check_out: e.end,
        total_price: 0, cleaning_fee: 0, deposit_amount: 0, guest_email: "", guest_phone: "", notes: "Imported via iCal", status: "confirmed",
      }));
      if (newBookings.length === 0) return 0;
      const { error } = await supabase.from("seasonal_bookings").insert(newBookings);
      if (error) throw error;
      return newBookings.length;
    } finally {
      setImporting(false);
    }
  }, [orgId, userId]);

  const importFromFile = useCallback(async (file: File, bookings: Booking[], defaultPropertyId: string): Promise<number> => {
    if (!orgId || !userId) return 0;
    setImporting(true);
    try {
      const text = await file.text();
      const events = parseICalEvents(text);
      if (events.length === 0) return 0;
      const existingDates = new Set(bookings.map((b) => `${b.check_in}-${b.check_out}-${b.guest_name}`));
      const newBookings = events.filter((e) => !existingDates.has(`${e.start}-${e.end}-${e.summary}`)).map((e) => ({
        org_id: orgId, user_id: userId, property_id: defaultPropertyId,
        guest_name: e.summary || "Imported guest", check_in: e.start, check_out: e.end,
        total_price: 0, cleaning_fee: 0, deposit_amount: 0, guest_email: "", guest_phone: "", notes: "Imported via iCal", status: "confirmed",
      }));
      if (newBookings.length === 0) return 0;
      const { error } = await supabase.from("seasonal_bookings").insert(newBookings);
      if (error) throw error;
      return newBookings.length;
    } finally {
      setImporting(false);
    }
  }, [orgId, userId]);

  return { importing, exportIcal, copyIcalContent, importFromUrl, importFromFile };
}
