/**
 * useSeasonalData — Extracted from SeasonalRentals.tsx
 * Handles: load bookings/properties/requests, save, delete, realtime, iCal, notifications.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { sendCommunicationEvent, createDeepLinkMeta } from "@/lib/shared";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export interface SeasonalBooking {
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

export interface SeasonalProperty {
  id: string;
  label: string;
  photo_urls?: any;
}

export function useSeasonalData() {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const [bookings, setBookings] = useState<SeasonalBooking[]>([]);
  const [properties, setProperties] = useState<SeasonalProperty[]>([]);
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

      const seasonalBookings = (b || []) as SeasonalBooking[];
      const paidRequests = (reqs || []).filter((r: any) => r.status === "paid" || r.status === "approved");
      const existingKeys = new Set(seasonalBookings.map(sb => `${sb.property_id}-${sb.check_in}-${sb.check_out}-${sb.guest_name}`));
      const missingBookings: SeasonalBooking[] = paidRequests
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
      console.error("[SeasonalData] load error:", err);
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

    await sendCommunicationEvent({
      orgId, senderId: user.id, recipientUserId: org?.owner_user_id || user.id,
      recipientEmail: orgEmail && isValidEmail(orgEmail) ? orgEmail : undefined,
      subject: title, message, category: "booking", meta,
    });

    if (bookingEmail && isValidEmail(bookingEmail)) {
      await sendCommunicationEvent({
        orgId, senderId: user.id, recipientEmail: bookingEmail,
        subject: t("page.seasonal.booking_confirmed_subject"),
        message: t("page.seasonal.booking_confirmed_body"),
        category: "booking", emailLocale: "fr", meta,
      });
    }
  }, [orgId, user, t]);

  const saveBooking = useCallback(async (record: any, editingId: string | null) => {
    if (!orgId || !user) return false;
    if (record.check_out <= record.check_in) {
      toast({ title: t("page.common.error"), description: t("page.seasonal.error_dates"), variant: "destructive" });
      return false;
    }
    const bookingEmail = normalizeEmail(record.guest_email);
    if (bookingEmail && !isValidEmail(bookingEmail)) {
      toast({ title: t("page.common.error"), description: t("page.seasonal.error_email"), variant: "destructive" });
      return false;
    }

    const dbRecord = { ...record, org_id: orgId, user_id: user.id };
    delete dbRecord.guest_address; delete dbRecord.guest_postal_code;
    delete dbRecord.guest_city; delete dbRecord.guest_country;
    delete dbRecord.identity_type; delete dbRecord.identity_number;

    if (editingId) {
      const { error } = await supabase.from("seasonal_bookings").update(dbRecord).eq("id", editingId);
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return false; }
      await notifyReservation(t("page.seasonal.modified_reservation_notif"), t("page.seasonal.modified_reservation_msg").replace("{name}", record.guest_name), bookingEmail || undefined);
      toast({ title: t("page.seasonal.booking_modified") });
      platformBus.emit(APP_EVENTS.SEASONAL_BOOKING_UPDATED as any, { bookingId: editingId }, "seasonal");
    } else {
      const { error } = await supabase.from("seasonal_bookings").insert({ ...dbRecord, status: "confirmed" });
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return false; }
      await notifyReservation(t("page.seasonal.new_reservation_notif"), t("page.seasonal.new_reservation_msg").replace("{name}", record.guest_name), bookingEmail || undefined);
      toast({ title: t("page.seasonal.booking_added") });
      platformBus.emit(APP_EVENTS.SEASONAL_BOOKING_CREATED as any, {}, "seasonal");
    }
    await load();
    return true;
  }, [orgId, user, t, toast, notifyReservation, load]);

  const deleteBooking = useCallback(async (id: string) => {
    await supabase.from("seasonal_bookings").delete().eq("id", id);
    toast({ title: t("page.seasonal.booking_deleted") });
    platformBus.emit(APP_EVENTS.SEASONAL_BOOKING_CANCELLED as any, { bookingId: id }, "seasonal");
    await load();
  }, [toast, t, load]);

  const importICalFromUrl = useCallback(async (url: string, defaultPropertyId: string, parseICalEvents: (ical: string) => any[]) => {
    if (!url.trim() || !orgId || !user) return 0;
    let icalText = "";
    try {
      const res = await fetch(url);
      icalText = await res.text();
    } catch {
      toast({ title: t("page.common.error"), description: t("page.seasonal.ical_error_fetch"), variant: "destructive" });
      return 0;
    }
    const events = parseICalEvents(icalText);
    if (events.length === 0) {
      toast({ title: t("page.seasonal.no_events"), description: t("page.seasonal.no_events_desc"), variant: "destructive" });
      return 0;
    }
    if (!defaultPropertyId) {
      toast({ title: t("page.common.error"), description: t("page.seasonal.ical_error_property"), variant: "destructive" });
      return 0;
    }
    const existingDates = new Set(bookings.map(b => `${b.check_in}-${b.check_out}-${b.guest_name}`));
    const newBookings = events
      .filter((e: any) => !existingDates.has(`${e.start}-${e.end}-${e.summary}`))
      .map((e: any) => ({
        org_id: orgId, user_id: user.id, property_id: defaultPropertyId,
        guest_name: e.summary || t("page.seasonal.imported_guest"),
        check_in: e.start, check_out: e.end, total_price: 0, cleaning_fee: 0, deposit_amount: 0,
        guest_email: "", guest_phone: "", notes: t("page.seasonal.imported_via_ical"), status: "confirmed",
      }));
    if (newBookings.length === 0) {
      toast({ title: t("page.seasonal.all_exist") });
      return 0;
    }
    const { error } = await supabase.from("seasonal_bookings").insert(newBookings);
    if (error) throw error;
    platformBus.emit(APP_EVENTS.SEASONAL_ICAL_SYNCED as any, { count: newBookings.length }, "seasonal");
    await load();
    return newBookings.length;
  }, [orgId, user, bookings, t, toast, load]);

  const importICalFromFile = useCallback(async (text: string, defaultPropertyId: string, parseICalEvents: (ical: string) => any[]) => {
    if (!orgId || !user) return 0;
    const events = parseICalEvents(text);
    if (events.length === 0) {
      toast({ title: t("page.seasonal.no_events"), variant: "destructive" });
      return 0;
    }
    if (!defaultPropertyId) {
      toast({ title: t("page.common.error"), description: t("page.seasonal.ical_error_property"), variant: "destructive" });
      return 0;
    }
    const existingDates = new Set(bookings.map(b => `${b.check_in}-${b.check_out}-${b.guest_name}`));
    const newBookings = events
      .filter((ev: any) => !existingDates.has(`${ev.start}-${ev.end}-${ev.summary}`))
      .map((ev: any) => ({
        org_id: orgId, user_id: user.id, property_id: defaultPropertyId,
        guest_name: ev.summary || t("page.seasonal.imported_guest"),
        check_in: ev.start, check_out: ev.end, total_price: 0, cleaning_fee: 0, deposit_amount: 0,
        guest_email: "", guest_phone: "", notes: t("page.seasonal.imported_via_file"), status: "confirmed",
      }));
    if (newBookings.length === 0) {
      toast({ title: t("page.seasonal.all_exist") });
      return 0;
    }
    const { error } = await supabase.from("seasonal_bookings").insert(newBookings);
    if (error) throw error;
    platformBus.emit(APP_EVENTS.SEASONAL_ICAL_SYNCED as any, { count: newBookings.length }, "seasonal");
    await load();
    return newBookings.length;
  }, [orgId, user, bookings, t, toast, load]);

  const loadRequest = useCallback(async (requestId: string) => {
    const { data } = await supabase.from("booking_requests").select("*").eq("id", requestId).single();
    return data;
  }, []);

  return {
    bookings, properties, allRequests, loading, loadError,
    reload: load, saveBooking, deleteBooking,
    importICalFromUrl, importICalFromFile, loadRequest,
  };
}
