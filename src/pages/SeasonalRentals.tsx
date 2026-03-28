import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { scrollToAndHighlight } from "@/lib/shared/deep-link";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSeasonalData } from "@/hooks/seasonal/useSeasonalData";
import { supabase } from "@/integrations/supabase/client";
import { sendCommunicationEvent, createDeepLinkMeta } from "@/lib/shared";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import { useSeasonalRequestActions } from "@/hooks/seasonal/useSeasonalRequestActions";
import { Plus, Trash2, ChevronLeft, ChevronRight, Download, Upload, Link2, Copy, Check, X, Edit, CalendarDays, Camera, LayoutGrid, List } from "lucide-react";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import PropertyPhotos from "@/components/seasonal/PropertyPhotos";
import ListingManager from "@/components/seasonal/ListingManager";
import SeasonalShowcase from "@/components/seasonal/SeasonalShowcase";
import SeasonalCalendarGrid from "@/components/seasonal/SeasonalCalendarGrid";
import SeasonalICalPanel from "@/components/seasonal/SeasonalICalPanel";
import { generateICalFeed, parseICalEvents } from "@/lib/seasonal/ical-helpers";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import BookingDocumentsPanel from "@/components/booking/BookingDocumentsPanel";

type IdentityType = "none" | "cni" | "passport";

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

interface Property { id: string; label: string; photo_urls?: any; }

interface SeasonalForm {
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_address: string;
  guest_postal_code: string;
  guest_city: string;
  guest_country: string;
  identity_type: IdentityType;
  identity_number: string;
  check_in: string;
  check_out: string;
  total_price: number;
  cleaning_fee: number;
  deposit_amount: number;
  notes: string;
}

const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* iCal helpers imported from src/lib/seasonal/ical-helpers.ts */

const SeasonalRentals = () => {
  const { user, orgId, subscription } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"showcase" | "bookings">(() => {
    return searchParams.get("booking") || searchParams.get("focusRequest") ? "bookings" : "showcase";
  });

  // ── Wired hook: ALL data + CRUD from useSeasonalData ──
  const {
    bookings, properties, allRequests, loading, loadError,
    reload: load, saveBooking, deleteBooking,
    importICalFromUrl, importICalFromFile,
  } = useSeasonalData();

  // Realtime already handled by useSeasonalData — no duplicate channel needed

  // ── Request actions hook: approve, reject, cancel, payment ──
  const {
    approveRequest, rejectRequest, cancelRequest, deleteRequest,
    generatePaymentLink, payingRequest,
  } = useSeasonalRequestActions({ properties, reload: load });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const monthParam = searchParams.get("month");
    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date();
  });
  const [lastAppliedBookingId, setLastAppliedBookingId] = useState<string | null>(null);
  const [deepLinkRequestId] = useState(() => searchParams.get("focusRequest") || null);
  const initialPropertyId = searchParams.get("propertyId") || "";

  const [form, setForm] = useState<SeasonalForm>({
    property_id: initialPropertyId, guest_name: "", guest_email: "", guest_phone: "",
    guest_address: "", guest_postal_code: "", guest_city: "", guest_country: "",
    identity_type: "none", identity_number: "",
    check_in: "", check_out: "", total_price: 0 as any, cleaning_fee: 0 as any,
    deposit_amount: 0 as any, notes: "",
  });
  const [payingRequest, setPayingRequest] = useState<string | null>(null);
  const [showIcalPanel, setShowIcalPanel] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [importingIcal, setImportingIcal] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [selectedPropertyForPhotos, setSelectedPropertyForPhotos] = useState<string | null>(null);
  const [focusedRequest, setFocusedRequest] = useState<any>(null);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editingRequestDates, setEditingRequestDates] = useState<{ check_in: string; check_out: string }>({ check_in: "", check_out: "" });

  // Deep link: focus request
  useEffect(() => {
    if (!deepLinkRequestId || !orgId) return;
    const loadRequest = async () => {
      const { data } = await supabase.from("booking_requests").select("*").eq("id", deepLinkRequestId).single();
      if (data) setFocusedRequest(data);
    };
    loadRequest();
    const next = new URLSearchParams(searchParams);
    next.delete("focusRequest");
    setSearchParams(next, { replace: true });
  }, [deepLinkRequestId, orgId]);

  // Deep link: scroll to booking
  useEffect(() => {
    const deepLinkBookingId = searchParams.get("booking");
    if (!deepLinkBookingId || deepLinkBookingId === lastAppliedBookingId) return;
    if (loading) return;
    const el = document.getElementById(`booking-${deepLinkBookingId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-accent");
      setTimeout(() => el.classList.remove("ring-2", "ring-accent"), 3000);
    } else {
      const found = bookings.find(b => String(b.id) === String(deepLinkBookingId));
      if (found) {
        startEdit(found);
      } else {
        const req = allRequests.find((r: any) => String(r.id) === String(deepLinkBookingId));
        if (req) { setFocusedRequest(req); }
        else { toast({ title: "Booking not found", description: "This booking is no longer available.", variant: "destructive" }); }
      }
    }
    setLastAppliedBookingId(deepLinkBookingId);
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete("booking"); return next; }, { replace: true });
  }, [searchParams, bookings, allRequests, loading, lastAppliedBookingId, setSearchParams]);

  const resetForm = () => {
    setForm({
      property_id: "", guest_name: "", guest_email: "", guest_phone: "",
      guest_address: "", guest_postal_code: "", guest_city: "", guest_country: "",
      identity_type: "none", identity_number: "",
      check_in: "", check_out: "", total_price: 0 as any, cleaning_fee: 0 as any,
      deposit_amount: 0 as any, notes: "",
    });
    setShowForm(false);
    setEditingId(null);
  };

  /** Save booking — delegates to useSeasonalData hook */
  const save = async () => {
    if (!orgId || !user || !form.guest_name || !form.property_id || !form.check_in || !form.check_out) return;

    const details = [
      form.guest_address && `${t("page.seasonal.full_address")}: ${form.guest_address}`,
      form.guest_postal_code && `${t("page.seasonal.postal_code")}: ${form.guest_postal_code}`,
      form.guest_city && `${t("page.seasonal.city")}: ${form.guest_city}`,
      form.guest_country && `${t("page.seasonal.country")}: ${form.guest_country}`,
      form.identity_type !== "none" && `${t("page.seasonal.identity_doc")}: ${form.identity_type === "cni" ? t("page.seasonal.id_cni") : t("page.seasonal.id_passport")}`,
      form.identity_number && `${t("page.seasonal.id_number")}: ${form.identity_number}`,
    ].filter(Boolean);

    const record = {
      property_id: form.property_id, guest_name: form.guest_name,
      guest_email: normalizeEmail(form.guest_email), guest_phone: form.guest_phone.trim(),
      check_in: form.check_in, check_out: form.check_out,
      total_price: form.total_price, cleaning_fee: form.cleaning_fee, deposit_amount: form.deposit_amount,
      notes: [form.notes.trim(), details.length ? `---\n${details.join("\n")}` : ""].filter(Boolean).join("\n"),
    };

    const ok = await saveBooking(record, editingId);
    if (ok) resetForm();
  };


  const startEdit = (b: Booking) => {
    setEditingId(b.id);
    setForm({
      property_id: b.property_id, guest_name: b.guest_name, guest_email: b.guest_email,
      guest_phone: b.guest_phone, guest_address: "", guest_postal_code: "", guest_city: "",
      guest_country: "France", identity_type: "none", identity_number: "",
      check_in: b.check_in, check_out: b.check_out, total_price: b.total_price,
      cleaning_fee: b.cleaning_fee, deposit_amount: b.deposit_amount, notes: b.notes,
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    await deleteBooking(id);
  };

  const propName = (id: string) => properties.find(p => p.id === id)?.label || "—";

  /* ─── iCal Export ─── */
  const handleExportIcal = () => {
    const ical = generateICalFeed(bookings, properties);
    const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "easy-locs-saisonnier.ics"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: t("page.seasonal.calendar_exported") });
  };

  const handleCopyIcalContent = () => {
    const ical = generateICalFeed(bookings, properties);
    navigator.clipboard.writeText(ical);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
    toast({ title: t("page.seasonal.ical_copied") });
  };

  /* ─── iCal Import ─── */
  const handleImportIcalUrl = async () => {
    if (!icalUrl.trim() || !orgId || !user) return;
    setImportingIcal(true);
    try {
      let icalText = "";
      try {
        const res = await fetch(icalUrl);
        icalText = await res.text();
      } catch {
        toast({ title: t("page.common.error"), description: t("page.seasonal.ical_error_fetch"), variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const events = parseICalEvents(icalText);
      if (events.length === 0) {
        toast({ title: t("page.seasonal.no_events"), description: t("page.seasonal.no_events_desc"), variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const existingDates = new Set(bookings.map(b => `${b.check_in}-${b.check_out}-${b.guest_name}`));
      const defaultPropId = form.property_id || properties[0]?.id;
      if (!defaultPropId) {
        toast({ title: t("page.common.error"), description: t("page.seasonal.ical_error_property"), variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const newBookings = events
        .filter(e => !existingDates.has(`${e.start}-${e.end}-${e.summary}`))
        .map(e => ({
          org_id: orgId, user_id: user.id, property_id: defaultPropId,
          guest_name: e.summary || t("page.seasonal.imported_guest"),
          check_in: e.start, check_out: e.end, total_price: 0, cleaning_fee: 0, deposit_amount: 0,
          guest_email: "", guest_phone: "", notes: t("page.seasonal.imported_via_ical"), status: "confirmed",
        }));
      if (newBookings.length === 0) {
        toast({ title: t("page.seasonal.all_exist") });
        setImportingIcal(false);
        return;
      }
      const { error } = await supabase.from("seasonal_bookings").insert(newBookings);
      if (error) throw error;
      toast({ title: `${newBookings.length} ${t("page.seasonal.ical_imported")}` });
      setIcalUrl("");
      await load();
    } catch (err: any) {
      toast({ title: t("page.seasonal.import_error"), description: err.message, variant: "destructive" });
    } finally {
      setImportingIcal(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId || !user) return;
    setImportingIcal(true);
    try {
      const text = await file.text();
      const events = parseICalEvents(text);
      if (events.length === 0) {
        toast({ title: t("page.seasonal.no_events"), variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const existingDates = new Set(bookings.map(b => `${b.check_in}-${b.check_out}-${b.guest_name}`));
      const defaultPropId = form.property_id || properties[0]?.id;
      if (!defaultPropId) {
        toast({ title: t("page.common.error"), description: t("page.seasonal.ical_error_property"), variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const newBookings = events
        .filter(ev => !existingDates.has(`${ev.start}-${ev.end}-${ev.summary}`))
        .map(ev => ({
          org_id: orgId, user_id: user.id, property_id: defaultPropId,
          guest_name: ev.summary || t("page.seasonal.imported_guest"),
          check_in: ev.start, check_out: ev.end, total_price: 0, cleaning_fee: 0, deposit_amount: 0,
          guest_email: "", guest_phone: "", notes: t("page.seasonal.imported_via_file"), status: "confirmed",
        }));
      if (newBookings.length === 0) {
        toast({ title: t("page.seasonal.all_exist") });
      } else {
        const { error } = await supabase.from("seasonal_bookings").insert(newBookings);
        if (error) throw error;
        toast({ title: `${newBookings.length} ${t("page.seasonal.ical_imported")}` });
        await load();
      }
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setImportingIcal(false);
      e.target.value = "";
    }
  };

  const calDays = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calMonth]);

  const bookingsForDay = (day: number) => {
    const dateStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.filter(b => b.check_in <= dateStr && b.check_out > dateStr);
  };

  const monthLabel = calMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dayNames = t("page.seasonal.day_names").split(",");

  return (
    <DashboardLayout>
      <FeatureGate feature="ota_sync" featureLabel={t("page.seasonal.feature_label")}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="page-header mb-0">
            <h1>{t("page.seasonal.title_page")}</h1>
            <p>{t("page.seasonal.subtitle_page")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("showcase")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors min-h-[36px] ${
                  viewMode === "showcase" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("page.seasonal.showcase") || "Properties"}</span>
              </button>
              <button
                onClick={() => setViewMode("bookings")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors min-h-[36px] ${
                  viewMode === "bookings" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("page.seasonal.bookings_view") || "Bookings"}</span>
              </button>
            </div>
            <button onClick={() => setShowIcalPanel(!showIcalPanel)} className="btn-secondary btn-sm min-h-[36px]">
              <Link2 className="h-4 w-4" /> <span className="hidden sm:inline">{t("page.seasonal.sync_ical")}</span>
            </button>
            <button onClick={() => { setViewMode("bookings"); setShowForm(true); }} className="btn-primary min-h-[36px]">
              <Plus className="h-4 w-4" /> {t("page.seasonal.reservation")}
            </button>
          </div>
        </div>

        {/* Showcase view */}
        {viewMode === "showcase" && (
          <SeasonalShowcase
            onEditListing={(propertyId) => {
              setSearchParams({ propertyId, tab: "listing" });
              setViewMode("bookings");
            }}
            onViewCalendar={(propertyId) => {
              setSearchParams({ propertyId });
              setViewMode("bookings");
            }}
            onViewBookings={(propertyId) => {
              setSearchParams({ propertyId });
              setViewMode("bookings");
            }}
          />
        )}

        {viewMode === "bookings" && showIcalPanel && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent" /> {t("page.seasonal.ical_sync_title")}</h3>
              <button onClick={() => setShowIcalPanel(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground">{t("page.seasonal.ical_import_desc")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Download className="h-4 w-4" /> {t("page.seasonal.import_airbnb")}</h4>
                <p className="text-xs text-muted-foreground">{t("page.seasonal.import_url_hint")}</p>
                <div className="flex gap-2">
                  <input value={icalUrl} onChange={e => setIcalUrl(e.target.value)} placeholder="https://www.airbnb.fr/calendar/ical/..." className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  <button onClick={handleImportIcalUrl} disabled={importingIcal || !icalUrl.trim()} className="bg-accent/20 text-accent px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/30 disabled:opacity-50">
                    {importingIcal ? t("page.seasonal.importing") : t("page.seasonal.import")}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("page.seasonal.or")}</span>
                  <label className="text-xs text-accent hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="h-3 w-3" /> {t("page.seasonal.upload_ics")}
                    <input type="file" accept=".ics,.ical" onChange={handleImportFile} className="hidden" />
                  </label>
                </div>
                {form.property_id === "" && properties.length > 1 && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{t("page.seasonal.import_property_label")}</label>
                    <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                      <option value="">{t("page.seasonal.default_property")}</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> {t("page.seasonal.export_title")}</h4>
                <p className="text-xs text-muted-foreground">{t("page.seasonal.export_desc")}</p>
                <div className="flex gap-2">
                  <button onClick={handleExportIcal} className="flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/30">
                    <Download className="h-3.5 w-3.5" /> {t("page.seasonal.download_ics")}
                  </button>
                  <button onClick={handleCopyIcalContent} className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-lg text-sm hover:bg-muted">
                     {copiedExport ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedExport ? t("page.seasonal.copied") : t("page.seasonal.copy")}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">{t("page.seasonal.export_hint")}</p>
              </div>
            </div>
          </div>
        )}

        {viewMode === "bookings" && focusedRequest && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                🏖️ {t("page.seasonal.booking_request")}
              </h3>
              <button onClick={() => setFocusedRequest(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground block text-xs">{t("page.seasonal.guest")}</span><span className="font-medium text-foreground">{focusedRequest.guest_name}</span></div>
              <div><span className="text-muted-foreground block text-xs">Email</span><span className="text-foreground">{focusedRequest.guest_email}</span></div>
              <div><span className="text-muted-foreground block text-xs">{t("page.seasonal.arrival")}</span><span className="font-medium text-foreground">{focusedRequest.check_in}</span></div>
              <div><span className="text-muted-foreground block text-xs">{t("page.seasonal.departure")}</span><span className="font-medium text-foreground">{focusedRequest.check_out}</span></div>
            </div>
            {focusedRequest.message && <p className="text-sm text-muted-foreground italic">"{focusedRequest.message}"</p>}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${
                focusedRequest.status === "paid" ? "bg-success/10 text-success" :
                focusedRequest.status === "approved" ? "bg-info/10 text-info" :
                focusedRequest.status === "rejected" ? "bg-destructive/10 text-destructive" :
                focusedRequest.status === "payment_pending" ? "bg-warning/10 text-warning" :
                focusedRequest.status === "pending" ? "bg-warning/10 text-warning" :
                "bg-muted text-muted-foreground"
              }`}>
                {focusedRequest.status === "paid" ? t("page.seasonal.status_paid") :
                 focusedRequest.status === "approved" ? t("page.seasonal.status_approved") :
                 focusedRequest.status === "rejected" ? t("page.seasonal.status_rejected") :
                 focusedRequest.status === "payment_pending" ? t("page.seasonal.status_payment_pending") :
                 focusedRequest.status === "pending" ? t("page.seasonal.status_pending_label") :
                 focusedRequest.status}
              </span>
            </div>
            {focusedRequest.status === "pending" && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                 <button
                  onClick={async () => {
                    await supabase.from("booking_requests").update({ status: "approved" } as any).eq("id", focusedRequest.id);
                    // Resolve notifications — real action completed
                    try {
                      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
                      await resolveNotificationsForTarget("booking_request", focusedRequest.id, user?.id);
                    } catch (e) { console.error("[resolve-notif]", e); }
                    if (orgId && user) {
                      await supabase.from("seasonal_bookings").insert({
                        org_id: orgId,
                        user_id: user.id,
                        property_id: focusedRequest.property_id,
                        guest_name: focusedRequest.guest_name,
                        guest_email: focusedRequest.guest_email,
                        guest_phone: focusedRequest.guest_phone || "",
                        check_in: focusedRequest.check_in,
                        check_out: focusedRequest.check_out,
                        total_price: 0,
                        cleaning_fee: 0,
                        deposit_amount: 0,
                        notes: focusedRequest.message || "",
                        status: "confirmed",
                      } as any);
                    }
                    const { data: listingData } = await supabase.from("public_listings").select("*").eq("id", focusedRequest.listing_id).single();
                    const nights = Math.max(1, Math.ceil((new Date(focusedRequest.check_out).getTime() - new Date(focusedRequest.check_in).getTime()) / 86400000));
                    const pricePerNight = listingData?.price_per_night || 0;
                    const totalAmount = pricePerNight * nights;
                    const payUrl = buildAppUrl(`/listing/${listingData?.slug}?pay_request=${focusedRequest.id}&email=${encodeURIComponent(focusedRequest.guest_email)}&name=${encodeURIComponent(focusedRequest.guest_name)}&amount=${totalAmount}&nights=${nights}`);
                    await supabase.functions.invoke("send-email", {
                      body: {
                        to: focusedRequest.guest_email,
                        subject: `✅ ${t("page.seasonal.approved_subject")} — ${listingData?.title || ""}`,
                        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                          <h2 style="color:#1a1a1a;text-align:center;">✅ ${t("page.seasonal.approved_heading")}</h2>
                          <p style="color:#555;font-size:15px;text-align:center;">${t("page.seasonal.approved_body").replace("{name}", focusedRequest.guest_name).replace("{checkin}", focusedRequest.check_in).replace("{checkout}", focusedRequest.check_out)}</p>
                          <p style="text-align:center;margin:24px 0;">
                            <a href="${payUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">💳 ${t("page.seasonal.pay_now_btn")} — ${totalAmount}€</a>
                          </p>
                          <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
                        </div>`,
                      },
                    });
                    toast({ title: t("page.seasonal.request_approved") });
                    setFocusedRequest({ ...focusedRequest, status: "approved" });
                    await load();
                  }}
                  className="btn-success btn-sm"
                >
                  <Check className="h-4 w-4" /> {t("page.seasonal.approve_btn")}
                </button>
                <button
                  onClick={async () => {
                    await supabase.from("booking_requests").update({ status: "rejected" } as any).eq("id", focusedRequest.id);
                    // Resolve notifications — action completed
                    try {
                      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
                      await resolveNotificationsForTarget("booking_request", focusedRequest.id, user?.id);
                    } catch (e) { console.error("[resolve-notif]", e); }
                    toast({ title: t("page.seasonal.request_rejected") });
                    setFocusedRequest({ ...focusedRequest, status: "rejected" });
                  }}
                  className="btn-secondary btn-sm border-destructive text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" /> {t("page.seasonal.reject_btn")}
                </button>
              </div>
            )}

            {/* Documents Panel */}
            {orgId && (
              <div className="pt-3 border-t border-border/50">
                <BookingDocumentsPanel
                  bookingId={focusedRequest.id}
                  orgId={orgId}
                  tableName="booking_requests"
                  documentUrls={Array.isArray(focusedRequest.document_urls) ? focusedRequest.document_urls : []}
                  onUpdate={load}
                  compact
                />
              </div>
            )}
          </div>
        )}

        {/* All Booking Requests panel — always visible */}
        {viewMode === "bookings" && allRequests.length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-6 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              📩 {t("page.seasonal.all_requests") !== "page.seasonal.all_requests" ? t("page.seasonal.all_requests") : "Demandes de réservation"}
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">{allRequests.length}</span>
            </h3>
            <div className="divide-y divide-border/50">
              {allRequests.map((req) => {
                const nights = Math.max(1, Math.ceil((new Date(req.check_out).getTime() - new Date(req.check_in).getTime()) / 86400000));
                const isActive = ["pending", "approved", "paid", "payment_pending"].includes(req.status);
                return (
                  <div key={req.id} className="py-3 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">{t("page.seasonal.guest")}</span>
                        <span className="font-medium text-foreground truncate block">{req.guest_name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Email</span>
                        <span className="text-foreground text-xs truncate block">{req.guest_email}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">{t("page.seasonal.arrival")}</span>
                        <span className="text-foreground">{req.check_in}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">{t("page.seasonal.departure")}</span>
                        <span className="text-foreground">{req.check_out}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge-status ${
                        req.status === "paid" ? "badge-success" :
                        req.status === "approved" ? "badge-info" :
                        req.status === "rejected" ? "badge-danger" :
                        req.status === "cancelled" ? "badge-danger" :
                        req.status === "payment_pending" ? "badge-warning" :
                        req.status === "pending" ? "badge-warning" :
                        "badge-neutral"
                      }`}>
                        {req.status === "paid" ? "✅ " + t("page.seasonal.status_paid") :
                         req.status === "approved" ? "📧 " + t("page.seasonal.status_approved") :
                         req.status === "rejected" ? "❌ " + t("page.seasonal.status_rejected") :
                         req.status === "cancelled" ? "🚫 " + t("page.seasonal.status_cancelled_label") :
                         req.status === "payment_pending" ? "⏳ " + t("page.seasonal.status_payment_pending") :
                         req.status === "pending" ? "🔔 " + t("page.seasonal.status_pending_label") :
                         req.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {req.status === "pending" && (
                        <>
                          <button
                            onClick={async () => {
                              await supabase.from("booking_requests").update({ status: "approved" } as any).eq("id", req.id);
                              if (orgId && user) {
                                await supabase.from("seasonal_bookings").insert({
                                  org_id: orgId, user_id: user.id, property_id: req.property_id,
                                  guest_name: req.guest_name, guest_email: req.guest_email, guest_phone: req.guest_phone || "",
                                  check_in: req.check_in, check_out: req.check_out, total_price: 0, cleaning_fee: 0, deposit_amount: 0,
                                  notes: req.message || "", status: "confirmed",
                                } as any);
                              }
                              const { data: listingData } = await supabase.from("public_listings").select("*").eq("id", req.listing_id).single();
                              const pricePerNight = listingData?.price_per_night || 0;
                              const totalAmount = pricePerNight * nights;
                              const payUrl = buildAppUrl(`/listing/${listingData?.slug}?pay_request=${req.id}&email=${encodeURIComponent(req.guest_email)}&name=${encodeURIComponent(req.guest_name)}&amount=${totalAmount}&nights=${nights}`);
                              await supabase.functions.invoke("send-email", {
                                body: {
                                  to: req.guest_email,
                                  subject: `✅ ${t("page.seasonal.approved_subject")} — ${listingData?.title || ""}`,
                                  html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                                    <h2 style="color:#1a1a1a;text-align:center;">✅ ${t("page.seasonal.approved_heading")}</h2>
                                    <p style="color:#555;font-size:15px;text-align:center;">${t("page.seasonal.approved_body").replace("{name}", req.guest_name).replace("{checkin}", req.check_in).replace("{checkout}", req.check_out)}</p>
                                    <p style="text-align:center;margin:24px 0;">
                                      <a href="${payUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">💳 ${t("page.seasonal.pay_now_btn")} — ${totalAmount}€</a>
                                    </p>
                                    <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
                                  </div>`,
                                },
                              });
                              toast({ title: t("page.seasonal.request_approved") });
                              await load();
                              await load();
                            }}
                            className="btn-success btn-sm"
                          >
                            <Check className="h-3.5 w-3.5" /> {t("page.seasonal.approve_btn")}
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from("booking_requests").update({ status: "rejected" } as any).eq("id", req.id);
                              await supabase.functions.invoke("send-email", {
                                body: {
                                  to: req.guest_email,
                                  subject: `❌ ${t("page.seasonal.rejected_email_subject")}`,
                                  html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                                    <h2 style="color:#1a1a1a;text-align:center;">❌ ${t("page.seasonal.rejected_email_heading")}</h2>
                                    <p style="color:#555;font-size:15px;text-align:center;">${t("page.seasonal.rejected_email_body").replace("{name}", req.guest_name).replace("{checkin}", req.check_in).replace("{checkout}", req.check_out)}</p>
                                    <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
                                  </div>`,
                                },
                              });
                              toast({ title: t("page.seasonal.request_rejected") });
                              await load();
                            }}
                            className="btn-secondary btn-sm border-destructive text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-3.5 w-3.5" /> {t("page.seasonal.reject_btn")}
                          </button>
                        </>
                      )}
                      {isActive && req.status !== "pending" && (
                        <>
                           {(req.status === "approved" || req.status === "payment_pending") && (
                            <button
                              disabled={payingRequest === req.id}
                              onClick={async () => {
                                setPayingRequest(req.id);
                                try {
                                  const { data: listingData } = await supabase.from("public_listings").select("*").eq("id", req.listing_id).single();
                                  const pricePerNight = listingData?.price_per_night || 0;
                                  const totalAmount = pricePerNight * nights;

                                  // Generate real Stripe checkout session
                                  const { data: stripeData, error: stripeError } = await supabase.functions.invoke("create-booking-payment", {
                                    body: {
                                      booking_request_id: req.id,
                                      listing_id: req.listing_id,
                                      guest_email: req.guest_email,
                                      guest_name: req.guest_name,
                                      amount: totalAmount,
                                      nights,
                                      property_label: listingData?.title || "",
                                      origin: window.location.origin,
                                    },
                                  });

                                  if (stripeError) throw stripeError;
                                  if (stripeData?.error) throw new Error(stripeData.error);

                                  // Update status
                                  await supabase.from("booking_requests").update({ status: "payment_pending" } as any).eq("id", req.id);

                                  // Send email with Stripe payment link
                                  if (stripeData?.url) {
                                    await supabase.functions.invoke("send-email", {
                                      body: {
                                        to: req.guest_email,
                                        subject: `💳 Payment — ${listingData?.title || ""}`,
                                        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                                          <h2 style="color:#1a1a1a;text-align:center;">💳 ${t("page.seasonal.pay_now_btn")}</h2>
                                          <p style="color:#555;font-size:15px;text-align:center;">${req.guest_name}, ${req.check_in} → ${req.check_out}</p>
                                          <p style="text-align:center;margin:24px 0;">
                                            <a href="${stripeData.url}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">💳 ${t("page.seasonal.pay_now_btn")} — ${totalAmount}€</a>
                                          </p>
                                          <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
                                        </div>`,
                                      },
                                    });
                                  }

                                  // Sync engine: payment_request_sent (booking thread + notification)
                                  const prop = properties.find((p: any) => p.id === req.property_id) as any;
                                  dispatchSyncEvent({
                                    type: "payment_request_sent",
                                    context: {
                                      orgId: orgId!,
                                      propertyId: req.property_id,
                                      bookingId: req.id,
                                      countryCode: prop?.country || "",
                                    },
                                    actorUserId: user!.id,
                                    targetEmail: req.guest_email,
                                    amount: totalAmount,
                                    currency: "EUR",
                                    description: `Payment for ${listingData?.title || ""} — ${req.check_in} → ${req.check_out}`,
                                    recipientName: req.guest_name,
                                  }).catch(() => {});

                                  toast({ title: "✅ Payment link generated and sent!" });
                                  await load();
                                } catch (err: any) {
                                  toast({ title: t("page.common.error"), description: err.message || "Payment link generation failed", variant: "destructive" });
                                } finally {
                                  setPayingRequest(null);
                                }
                              }}
                              className="btn-success btn-sm disabled:opacity-50"
                            >
                              {payingRequest === req.id ? "⏳..." : `💳 ${t("page.seasonal.pay_now_btn")}`}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setFocusedRequest(req);
                              setEditingRequestDates({ check_in: req.check_in, check_out: req.check_out });
                              setShowEditRequestModal(true);
                            }}
                            className="btn-secondary btn-sm"
                          >
                            <Edit className="h-3.5 w-3.5" /> {t("page.seasonal.modify_dates_btn")}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(t("page.seasonal.confirm_cancel"))) return;
                              await supabase.from("booking_requests").update({ status: "cancelled" } as any).eq("id", req.id);
                              if (orgId) {
                                await supabase.from("seasonal_bookings").delete()
                                  .eq("org_id", orgId).eq("property_id", req.property_id)
                                  .eq("check_in", req.check_in).eq("check_out", req.check_out)
                                  .eq("guest_name", req.guest_name);
                              }
                              await supabase.functions.invoke("send-email", {
                                body: {
                                  to: req.guest_email,
                                  subject: `🚫 ${t("page.seasonal.cancelled_email_subject")}`,
                                  html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                                    <h2 style="color:#dc2626;text-align:center;">🚫 ${t("page.seasonal.cancelled_email_heading")}</h2>
                                    <p style="color:#555;font-size:15px;text-align:center;">${t("page.seasonal.cancelled_email_body").replace("{name}", req.guest_name).replace("{checkin}", req.check_in).replace("{checkout}", req.check_out)}</p>
                                    <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
                                  </div>`,
                                },
                              });
                              toast({ title: t("page.seasonal.request_cancelled") });
                              await load();
                              await load();
                            }}
                            className="btn-secondary btn-sm border-destructive text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-3.5 w-3.5" /> {t("page.seasonal.cancel_booking_btn")}
                          </button>
                        </>
                      )}
                      {!isActive && req.status !== "pending" && (
                        <button
                          onClick={async () => {
                            await supabase.from("booking_requests").delete().eq("id", req.id);
                            toast({ title: t("page.seasonal.booking_deleted") });
                            await load();
                          }}
                          className="btn-secondary btn-sm border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("page.seasonal.delete_btn")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "bookings" && <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
            <h3 className="font-semibold text-foreground capitalize">{monthLabel}</h3>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {dayNames.map(d => <div key={d} className="text-center text-muted-foreground font-medium py-1">{d}</div>)}
            {calDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const dayBookings = bookingsForDay(day);
              const MAX_VISIBLE = 2;
              const visible = dayBookings.slice(0, MAX_VISIBLE);
              const overflow = dayBookings.length - MAX_VISIBLE;
              const laneColors = [
                "bg-primary/15 text-primary border-l-2 border-primary/40",
                "bg-accent/15 text-accent border-l-2 border-accent/40",
                "bg-orange-500/15 text-orange-700 border-l-2 border-orange-400/40",
              ];
              return (
                <div key={i} className={`min-h-[52px] sm:min-h-[68px] p-0.5 sm:p-1 rounded-lg border text-xs relative overflow-hidden ${dayBookings.length > 0 ? "border-primary/30 bg-primary/5" : "border-border/30"}`}>
                  <span className="text-foreground font-medium block mb-0.5">{day}</span>
                  <div className="space-y-0.5">
                    {visible.map((b, idx) => (
                      <div
                        key={b.id}
                        className={`text-[10px] px-1 py-px rounded truncate cursor-pointer hover:opacity-80 group/booking ${laneColors[idx % laneColors.length]}`}
                        title={`${b.guest_name} (${b.check_in} → ${b.check_out}) — ${t("page.seasonal.click_to_edit") !== "page.seasonal.click_to_edit" ? t("page.seasonal.click_to_edit") : "Cliquer pour modifier"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(b);
                          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                        }}
                      >
                        <span className="flex items-center gap-0.5">
                          {b.guest_name}
                          <span className="hidden group-hover/booking:inline-flex items-center gap-0.5 ml-auto">
                            <Edit className="h-2.5 w-2.5" />
                            <button
                              onClick={(e) => { e.stopPropagation(); remove(b.id); }}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        </span>
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="text-[10px] text-muted-foreground font-medium px-1" title={dayBookings.slice(MAX_VISIBLE).map(b => b.guest_name).join(", ")}>
                        +{overflow} {overflow > 1 ? t("page.seasonal.other_plural") : t("page.seasonal.other_singular")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {viewMode === "bookings" && properties.length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Camera className="h-4 w-4 text-accent" /> {t("page.seasonal.photos_listing")}
              </h3>
              <select
                value={selectedPropertyForPhotos || properties[0]?.id || ""}
                onChange={e => setSelectedPropertyForPhotos(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
              >
                {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {(() => {
              const propId = selectedPropertyForPhotos || properties[0]?.id;
              const prop = properties.find(p => p.id === propId);
              if (!propId || !prop) return null;
              const currentPhotos: string[] = Array.isArray(prop.photo_urls) ? prop.photo_urls : [];
              return (
                <div className="space-y-6">
                  <PropertyPhotos
                    propertyId={propId}
                    orgId={orgId || ""}
                    photos={currentPhotos}
                    onPhotosChange={(urls) => {
                      load();
                    }}
                    allowVideo={subscription.subscribed}
                  />
                  <div className="border-t border-border/50 pt-4">
                    <ListingManager propertyId={propId} propertyLabel={prop.label} />
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {viewMode === "bookings" && showForm && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{editingId ? t("page.seasonal.edit_booking") : t("page.seasonal.new_booking")}</h3>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.guest_required")}</label><input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.property_required")}</label><select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="">{t("page.seasonal.select_dash")}</option>{properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.arrival_required")}</label><input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.departure_required")}</label><input type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Email</label><input value={form.guest_email} onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.company.jal_address")}</label><input value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.full_address")}</label>
                <AddressAutocomplete value={form.guest_address} onChange={(val) => setForm(f => ({ ...f, guest_address: val }))}
                  onSelect={(result: AddressResult) => setForm(f => ({ ...f, guest_address: result.label || "", guest_postal_code: result.postcode || f.guest_postal_code, guest_city: result.city || f.guest_city, guest_country: result.country || f.guest_country }))} />
              </div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.postal_code")}</label><input value={form.guest_postal_code} onChange={e => setForm(f => ({ ...f, guest_postal_code: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.city")}</label><input value={form.guest_city} onChange={e => setForm(f => ({ ...f, guest_city: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.country")}</label><input value={form.guest_country} onChange={e => setForm(f => ({ ...f, guest_country: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.identity_doc")}</label><select value={form.identity_type} onChange={e => setForm(f => ({ ...f, identity_type: e.target.value as IdentityType }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="none">{t("page.seasonal.id_none")}</option><option value="cni">{t("page.seasonal.id_cni")}</option><option value="passport">{t("page.seasonal.id_passport")}</option></select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.id_number")}</label><input value={form.identity_number} onChange={e => setForm(f => ({ ...f, identity_number: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.total_price_eur")}</label><input type="number" value={form.total_price || ""} onFocus={e => { if (e.target.value === "0") e.target.value = ""; }} onChange={e => setForm(f => ({ ...f, total_price: e.target.value === "" ? 0 : +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.cleaning_fee_eur")}</label><input type="number" value={form.cleaning_fee || ""} onFocus={e => { if (e.target.value === "0") e.target.value = ""; }} onChange={e => setForm(f => ({ ...f, cleaning_fee: e.target.value === "" ? 0 : +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.seasonal.notes")}</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={save} className="bg-gradient-gold text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">{editingId ? t("page.seasonal.save_btn") : t("page.seasonal.add_btn")}</button>
              <button onClick={resetForm} className="border border-border text-foreground px-6 py-2 rounded-lg text-sm hover:bg-muted">{t("page.seasonal.cancel_btn")}</button>
            </div>
          </div>
        )}

        {viewMode === "bookings" && <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-pulse">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-64" />
                  </div>
                  <div className="h-6 bg-muted rounded-full w-20" />
                  <div className="flex gap-2">
                    <div className="h-9 w-9 bg-muted rounded-lg" />
                    <div className="h-9 w-9 bg-muted rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={() => { load(); }} />
          ) :
            bookings.length === 0 ? <p className="text-center text-muted-foreground py-8">{t("page.seasonal.no_reservations")}</p> :
              bookings.map(b => (
                <div key={b.id} id={`booking-${b.id}`} className="bg-card rounded-xl border border-border/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 group transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{b.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{propName(b.property_id)} · {b.check_in} → {b.check_out}</p>
                    {b.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{b.notes}</p>}
                  </div>
                  <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium self-start ${b.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                    {b.status === "cancelled" ? t("page.seasonal.status_cancelled_label") : t("page.seasonal.status_confirmed_label")}
                  </span>
                  <p className="text-sm font-bold text-foreground">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(b.total_price)}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(b)} className="text-muted-foreground hover:text-foreground"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => remove(b.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
        </div>}
        {/* Edit dates modal */}
        {showEditRequestModal && focusedRequest && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEditRequestModal(false)}>
            <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{t("page.seasonal.modify_dates_title")}</h3>
                <button onClick={() => setShowEditRequestModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-sm text-muted-foreground">{focusedRequest.guest_name} — {propName(focusedRequest.property_id)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.seasonal.arrival")}</label>
                  <input type="date" value={editingRequestDates.check_in} onChange={e => setEditingRequestDates(d => ({ ...d, check_in: e.target.value }))}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.seasonal.departure")}</label>
                  <input type="date" value={editingRequestDates.check_out} onChange={e => setEditingRequestDates(d => ({ ...d, check_out: e.target.value }))}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none" />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (editingRequestDates.check_out <= editingRequestDates.check_in) {
                    toast({ title: t("page.common.error"), description: t("page.seasonal.error_dates"), variant: "destructive" });
                    return;
                  }
                  await supabase.from("booking_requests").update({
                    check_in: editingRequestDates.check_in,
                    check_out: editingRequestDates.check_out,
                  } as any).eq("id", focusedRequest.id);
                  // Update matching seasonal_booking too
                  if (orgId) {
                    await supabase.from("seasonal_bookings").update({
                      check_in: editingRequestDates.check_in,
                      check_out: editingRequestDates.check_out,
                    } as any)
                      .eq("org_id", orgId).eq("property_id", focusedRequest.property_id)
                      .eq("check_in", focusedRequest.check_in).eq("check_out", focusedRequest.check_out)
                      .eq("guest_name", focusedRequest.guest_name);
                  }
                  // Send modification email
                  await supabase.functions.invoke("send-email", {
                    body: {
                      to: focusedRequest.guest_email,
                      subject: `📅 ${t("page.seasonal.modified_email_subject")}`,
                      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                        <h2 style="color:#1a1a1a;text-align:center;">📅 ${t("page.seasonal.modified_email_heading")}</h2>
                        <p style="color:#555;font-size:15px;text-align:center;">${t("page.seasonal.modified_email_body").replace("{name}", focusedRequest.guest_name).replace("{checkin}", editingRequestDates.check_in).replace("{checkout}", editingRequestDates.check_out)}</p>
                        <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
                      </div>`,
                    },
                  });
                  toast({ title: t("page.seasonal.dates_modified") });
                  await load();
                  setShowEditRequestModal(false);
                  setFocusedRequest(null);
                  await load();
                }}
                className="w-full bg-gradient-gold text-accent-foreground px-6 py-2.5 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90"
              >
                {t("page.seasonal.save_dates_btn")}
              </button>
            </div>
          </div>
        )}
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default SeasonalRentals;
