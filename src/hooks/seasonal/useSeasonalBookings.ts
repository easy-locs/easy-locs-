/**
 * useSeasonalBookings — Extracted from SeasonalRentals.tsx
 * All booking CRUD, iCal import/export, realtime, deep-linking.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { sendCommunicationEvent, createDeepLinkMeta } from "@/lib/shared";

interface Booking {
  id: string; property_id: string; guest_name: string; guest_email: string;
  guest_phone: string; check_in: string; check_out: string;
  total_price: number; cleaning_fee: number; deposit_amount: number;
  status: string; notes: string;
}

interface Property { id: string; label: string; photo_urls?: any; }

const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const toICalDate = (d: string) => d.replace(/-/g, "");

export function useSeasonalBookings() {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoadError(null);
    try {
      const [{ data: b, error: bErr }, { data: p }, { data: reqs }] = await Promise.all([
        supabase.from("seasonal_bookings").select("*").eq("org_id", orgId).order("check_in"),
        supabase.from("properties").select("id, label, photo_urls").eq("org_id", orgId).order("label"),
        supabase.from("booking_requests").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50),
      ]);
      if (bErr) throw bErr;
      const seasonalBookings = (b || []) as Booking[];
      const paidRequests = (reqs || []).filter((r: any) => r.status === "paid" || r.status === "approved");
      const existingKeys = new Set(seasonalBookings.map(sb => `${sb.property_id}-${sb.check_in}-${sb.check_out}-${sb.guest_name}`));
      const missingBookings: Booking[] = paidRequests
        .filter((r: any) => !existingKeys.has(`${r.property_id}-${r.check_in}-${r.check_out}-${r.guest_name}`))
        .map((r: any) => ({
          id: r.id, property_id: r.property_id, guest_name: r.guest_name,
          guest_email: r.guest_email || "", guest_phone: r.guest_phone || "",
          check_in: r.check_in, check_out: r.check_out,
          total_price: 0, cleaning_fee: 0, deposit_amount: 0,
          status: "confirmed", notes: `Via booking request (${r.status})`,
        }));
      setBookings([...seasonalBookings, ...missingBookings]);
      if (p) setProperties(p);
      if (reqs) setAllRequests(reqs);
    } catch (err: any) {
      setLoadError(t("error.load_failed") || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("seasonal-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_requests", filter: `org_id=eq.${orgId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, load]);

  const notifyReservation = useCallback(async (title: string, message: string, bookingEmail?: string, bookingId?: string) => {
    if (!orgId || !user) return;
    const { data: org } = await supabase.from("orgs").select("owner_user_id, email, name").eq("id", orgId).single();
    const orgEmail = normalizeEmail(org?.email);
    const meta = createDeepLinkMeta({ targetType: "booking_request", targetId: bookingId || "", module: "seasonal", countryCode: "", bookingId, orgId });
    await sendCommunicationEvent({ orgId, senderId: user.id, recipientUserId: org?.owner_user_id || user.id, recipientEmail: orgEmail && isValidEmail(orgEmail) ? orgEmail : undefined, subject: title, message, category: "booking", meta });
    if (bookingEmail && isValidEmail(bookingEmail)) {
      await sendCommunicationEvent({ orgId, senderId: user.id, recipientEmail: bookingEmail, subject: t("page.seasonal.booking_confirmed_subject"), message: t("page.seasonal.booking_confirmed_body"), category: "booking", emailLocale: "fr", meta });
    }
  }, [orgId, user, t]);

  const saveBooking = useCallback(async (form: any, editingId: string | null) => {
    if (!orgId || !user || !form.guest_name || !form.property_id || !form.check_in || !form.check_out) return false;
    if (form.check_out <= form.check_in) { toast({ title: t("page.common.error"), description: t("page.seasonal.error_dates"), variant: "destructive" }); return false; }
    const bookingEmail = normalizeEmail(form.guest_email);
    if (bookingEmail && !isValidEmail(bookingEmail)) { toast({ title: t("page.common.error"), description: t("page.seasonal.error_email"), variant: "destructive" }); return false; }

    const details = [
      form.guest_address && `Address: ${form.guest_address}`,
      form.guest_postal_code && `Postal: ${form.guest_postal_code}`,
      form.guest_city && `City: ${form.guest_city}`,
      form.guest_country && `Country: ${form.guest_country}`,
    ].filter(Boolean);

    const record = {
      org_id: orgId, user_id: user.id, property_id: form.property_id,
      guest_name: form.guest_name, guest_email: bookingEmail,
      guest_phone: (form.guest_phone || "").trim(),
      check_in: form.check_in, check_out: form.check_out,
      total_price: form.total_price, cleaning_fee: form.cleaning_fee,
      deposit_amount: form.deposit_amount,
      notes: [form.notes?.trim(), details.length ? `---\n${details.join("\n")}` : ""].filter(Boolean).join("\n"),
    };

    if (editingId) {
      const { error } = await supabase.from("seasonal_bookings").update(record).eq("id", editingId);
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return false; }
      await notifyReservation(t("page.seasonal.modified_reservation_notif"), t("page.seasonal.modified_reservation_msg").replace("{name}", form.guest_name), bookingEmail || undefined);
      toast({ title: t("page.seasonal.booking_modified") });
    } else {
      const { error } = await supabase.from("seasonal_bookings").insert({ ...record, status: "confirmed" });
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return false; }
      await notifyReservation(t("page.seasonal.new_reservation_notif"), t("page.seasonal.new_reservation_msg").replace("{name}", form.guest_name), bookingEmail || undefined);
      toast({ title: t("page.seasonal.booking_added") });
    }
    await load();
    return true;
  }, [orgId, user, toast, t, notifyReservation, load]);

  const deleteBooking = useCallback(async (id: string) => {
    const { error } = await supabase.from("seasonal_bookings").delete().eq("id", id);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("page.seasonal.booking_deleted") });
    await load();
  }, [toast, t, load]);

  const generateICalFeed = useCallback(() => {
    const propName = (id: string) => properties.find(p => p.id === id)?.label || "Property";
    const events = bookings.map(b => [
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${toICalDate(b.check_in)}`,
      `DTEND;VALUE=DATE:${toICalDate(b.check_out)}`,
      `SUMMARY:${b.guest_name} — ${propName(b.property_id)}`,
      `UID:${b.id}@easy-locs`,
      `STATUS:${b.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    ].join("\r\n"));
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Easy-Locs//Seasonal//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR"].join("\r\n");
  }, [bookings, properties]);

  return {
    bookings, properties, allRequests, loading, loadError,
    load, saveBooking, deleteBooking, generateICalFeed,
  };
}

export type { Booking, Property };
