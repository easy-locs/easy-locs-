import { useState, useEffect, useCallback, useMemo } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronLeft, ChevronRight, Download, Upload, Link2, Copy, Check, X, Edit, CalendarDays } from "lucide-react";

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

interface Property { id: string; label: string; }

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

/* ─── iCal helpers ─── */
const toICalDate = (d: string) => d.replace(/-/g, "");

const generateICalFeed = (bookings: Booking[], properties: Property[]) => {
  const propName = (id: string) => properties.find(p => p.id === id)?.label || "Logement";
  const events = bookings.map(b => [
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${toICalDate(b.check_in)}`,
    `DTEND;VALUE=DATE:${toICalDate(b.check_out)}`,
    `SUMMARY:${b.guest_name} — ${propName(b.property_id)}`,
    `DESCRIPTION:Prix: ${b.total_price}€ | Tél: ${b.guest_phone || "—"} | Email: ${b.guest_email || "—"}`,
    `UID:${b.id}@easy-locs`,
    `STATUS:${b.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ].join("\r\n"));

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Easy-Locs//Saisonnier//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Easy-Locs Saisonnier",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
};

const parseICalEvents = (ical: string): { summary: string; start: string; end: string; uid: string }[] => {
  const events: { summary: string; start: string; end: string; uid: string }[] = [];
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
};

const SeasonalRentals = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [form, setForm] = useState<SeasonalForm>({
    property_id: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    guest_address: "",
    guest_postal_code: "",
    guest_city: "",
    guest_country: "France",
    identity_type: "none",
    identity_number: "",
    check_in: "",
    check_out: "",
    total_price: 0,
    cleaning_fee: 0,
    deposit_amount: 0,
    notes: "",
  });
  const [showIcalPanel, setShowIcalPanel] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [importingIcal, setImportingIcal] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from("seasonal_bookings").select("*").eq("org_id", orgId).order("check_in"),
      supabase.from("properties").select("id, label").eq("org_id", orgId).order("label"),
    ]);
    if (b) setBookings(b as Booking[]);
    if (p) setProperties(p);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({
      property_id: "",
      guest_name: "",
      guest_email: "",
      guest_phone: "",
      guest_address: "",
      guest_postal_code: "",
      guest_city: "",
      guest_country: "France",
      identity_type: "none",
      identity_number: "",
      check_in: "",
      check_out: "",
      total_price: 0,
      cleaning_fee: 0,
      deposit_amount: 0,
      notes: "",
    });
    setShowForm(false);
    setEditingId(null);
  };

  const notifyReservation = async (title: string, message: string, bookingEmail?: string) => {
    if (!orgId || !user) return;

    const { data: org } = await supabase
      .from("orgs")
      .select("owner_user_id, email, name")
      .eq("id", orgId)
      .single();

    const targets = Array.from(new Set([user.id, org?.owner_user_id].filter(Boolean)));
    await Promise.all(
      targets.map((targetUserId) =>
        supabase.from("notifications").insert({
          user_id: targetUserId,
          org_id: orgId,
          type: "info",
          title,
          message,
          link: "/seasonal-rentals",
        })
      )
    );

    const orgEmail = normalizeEmail(org?.email);
    if (orgEmail && isValidEmail(orgEmail)) {
      await supabase.functions.invoke("send-email", {
        body: {
          to: orgEmail,
          subject: title,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
            <h2 style="color:#1a1a1a;text-align:center;">🏖️ ${title}</h2>
            <p style="color:#555;font-size:15px;">${message}</p>
            <p style="color:#888;font-size:12px;text-align:center;">Notification automatique Easy-Locs.</p>
          </div>`,
        },
      });
    }

    if (bookingEmail && isValidEmail(bookingEmail)) {
      await supabase.functions.invoke("send-email", {
        body: {
          to: bookingEmail,
          subject: "Réservation confirmée",
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
            <h2 style="color:#1a1a1a;text-align:center;">✅ Réservation confirmée</h2>
            <p style="color:#555;font-size:15px;">Votre réservation a bien été enregistrée.</p>
            <p style="color:#888;font-size:12px;text-align:center;">Email automatique Easy-Locs.</p>
          </div>`,
        },
      });
    }
  };

  const save = async () => {
    if (!orgId || !user || !form.guest_name || !form.property_id || !form.check_in || !form.check_out) return;

    if (form.check_out <= form.check_in) {
      toast({ title: "Erreur", description: "La date de départ doit être après la date d'arrivée.", variant: "destructive" });
      return;
    }

    const bookingEmail = normalizeEmail(form.guest_email);
    if (bookingEmail && !isValidEmail(bookingEmail)) {
      toast({ title: "Erreur", description: "Email voyageur invalide.", variant: "destructive" });
      return;
    }

    const details = [
      form.guest_address && `Adresse: ${form.guest_address}`,
      form.guest_postal_code && `Code postal: ${form.guest_postal_code}`,
      form.guest_city && `Ville: ${form.guest_city}`,
      form.guest_country && `Pays: ${form.guest_country}`,
      form.identity_type !== "none" && `Identité: ${form.identity_type === "cni" ? "CNI" : "Passeport"}`,
      form.identity_number && `N° pièce: ${form.identity_number}`,
    ].filter(Boolean);

    const record = {
      org_id: orgId,
      user_id: user.id,
      property_id: form.property_id,
      guest_name: form.guest_name,
      guest_email: bookingEmail,
      guest_phone: form.guest_phone.trim(),
      check_in: form.check_in,
      check_out: form.check_out,
      total_price: form.total_price,
      cleaning_fee: form.cleaning_fee,
      deposit_amount: form.deposit_amount,
      notes: [form.notes.trim(), details.length ? `---\n${details.join("\n")}` : ""].filter(Boolean).join("\n"),
    };

    if (editingId) {
      const { error } = await supabase.from("seasonal_bookings").update(record).eq("id", editingId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      await notifyReservation("Réservation modifiée", `Réservation mise à jour pour ${form.guest_name}.`, bookingEmail || undefined);
      toast({ title: "Réservation modifiée" });
    } else {
      const { error } = await supabase.from("seasonal_bookings").insert({ ...record, status: "confirmed" });
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      await notifyReservation("Nouvelle réservation", `Nouvelle réservation pour ${form.guest_name}.`, bookingEmail || undefined);
      toast({ title: "Réservation ajoutée" });
    }

    resetForm();
    await load();
  };

  const startEdit = (b: Booking) => {
    setEditingId(b.id);
    setForm({
      property_id: b.property_id,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      guest_phone: b.guest_phone,
      guest_address: "",
      guest_postal_code: "",
      guest_city: "",
      guest_country: "France",
      identity_type: "none",
      identity_number: "",
      check_in: b.check_in,
      check_out: b.check_out,
      total_price: b.total_price,
      cleaning_fee: b.cleaning_fee,
      deposit_amount: b.deposit_amount,
      notes: b.notes,
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    await supabase.from("seasonal_bookings").delete().eq("id", id);
    toast({ title: "Réservation supprimée" });
    await load();
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
    toast({ title: "Calendrier exporté (.ics)" });
  };

  const handleCopyIcalContent = () => {
    const ical = generateICalFeed(bookings, properties);
    navigator.clipboard.writeText(ical);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
    toast({ title: "Contenu iCal copié" });
  };

  /* ─── iCal Import ─── */
  const handleImportIcalUrl = async () => {
    if (!icalUrl.trim() || !orgId || !user) return;
    setImportingIcal(true);
    try {
      // Try fetching via a CORS proxy or directly
      let icalText = "";
      try {
        const res = await fetch(icalUrl);
        icalText = await res.text();
      } catch {
        toast({ title: "Erreur", description: "Impossible de récupérer le calendrier. Collez le contenu .ics directement.", variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const events = parseICalEvents(icalText);
      if (events.length === 0) {
        toast({ title: "Aucun événement trouvé", description: "Le fichier iCal ne contient pas de réservations.", variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      // Insert new bookings (skip existing by UID check via date match)
      const existingDates = new Set(bookings.map(b => `${b.check_in}-${b.check_out}-${b.guest_name}`));
      const defaultPropId = form.property_id || properties[0]?.id;
      if (!defaultPropId) {
        toast({ title: "Erreur", description: "Sélectionnez un bien avant l'import iCal.", variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const newBookings = events
        .filter(e => !existingDates.has(`${e.start}-${e.end}-${e.summary}`))
        .map(e => ({
          org_id: orgId, user_id: user.id, property_id: defaultPropId,
          guest_name: e.summary || "Voyageur importé",
          check_in: e.start, check_out: e.end, total_price: 0, cleaning_fee: 0, deposit_amount: 0,
          guest_email: "", guest_phone: "", notes: "Importé via iCal", status: "confirmed",
        }));
      if (newBookings.length === 0) {
        toast({ title: "Toutes les réservations existent déjà" });
        setImportingIcal(false);
        return;
      }
      const { error } = await supabase.from("seasonal_bookings").insert(newBookings);
      if (error) throw error;
      toast({ title: `${newBookings.length} réservation(s) importée(s)` });
      setIcalUrl("");
      await load();
    } catch (err: any) {
      toast({ title: "Erreur d'import", description: err.message, variant: "destructive" });
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
        toast({ title: "Aucun événement trouvé", variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const existingDates = new Set(bookings.map(b => `${b.check_in}-${b.check_out}-${b.guest_name}`));
      const defaultPropId = form.property_id || properties[0]?.id;
      if (!defaultPropId) {
        toast({ title: "Erreur", description: "Sélectionnez un bien avant l'import iCal.", variant: "destructive" });
        setImportingIcal(false);
        return;
      }
      const newBookings = events
        .filter(ev => !existingDates.has(`${ev.start}-${ev.end}-${ev.summary}`))
        .map(ev => ({
          org_id: orgId, user_id: user.id, property_id: defaultPropId,
          guest_name: ev.summary || "Voyageur importé",
          check_in: ev.start, check_out: ev.end, total_price: 0, cleaning_fee: 0, deposit_amount: 0,
          guest_email: "", guest_phone: "", notes: "Importé via fichier iCal", status: "confirmed",
        }));
      if (newBookings.length === 0) {
        toast({ title: "Toutes les réservations existent déjà" });
      } else {
        const { error } = await supabase.from("seasonal_bookings").insert(newBookings);
        if (error) throw error;
        toast({ title: `${newBookings.length} réservation(s) importée(s)` });
        await load();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setImportingIcal(false);
      e.target.value = "";
    }
  };

  // Calendar grid
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

  const monthLabel = calMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <DashboardLayout>
      <FeatureGate feature="ota_sync" featureLabel="Locations saisonnières & OTA">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Location saisonnière</h1>
            <p className="text-sm text-muted-foreground">Réservations, calendrier et synchronisation Airbnb / Booking</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowIcalPanel(!showIcalPanel)} className="flex items-center gap-2 border border-border text-foreground px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors">
              <Link2 className="h-4 w-4" /> Sync iCal
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">
              <Plus className="h-4 w-4" /> Réservation
            </button>
          </div>
        </div>

        {/* iCal Sync Panel */}
        {showIcalPanel && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent" /> Synchronisation iCal</h3>
              <button onClick={() => setShowIcalPanel(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground">Importez vos réservations depuis Airbnb ou Booking.com via leur lien iCal, ou exportez vos réservations Easy-Locs.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Import */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Download className="h-4 w-4" /> Importer (Airbnb / Booking)</h4>
                <p className="text-xs text-muted-foreground">Collez l'URL du calendrier iCal de votre annonce Airbnb ou Booking.com :</p>
                <div className="flex gap-2">
                  <input value={icalUrl} onChange={e => setIcalUrl(e.target.value)} placeholder="https://www.airbnb.fr/calendar/ical/..." className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  <button onClick={handleImportIcalUrl} disabled={importingIcal || !icalUrl.trim()} className="bg-accent/20 text-accent px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/30 disabled:opacity-50">
                    {importingIcal ? "Import…" : "Importer"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">ou</span>
                  <label className="text-xs text-accent hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="h-3 w-3" /> Charger un fichier .ics
                    <input type="file" accept=".ics,.ical" onChange={handleImportFile} className="hidden" />
                  </label>
                </div>
                {form.property_id === "" && properties.length > 1 && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Bien pour les imports :</label>
                    <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                      <option value="">Premier bien par défaut</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Export */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> Exporter vers Airbnb / Booking</h4>
                <p className="text-xs text-muted-foreground">Téléchargez le fichier .ics de vos réservations Easy-Locs pour l'importer dans Airbnb ou Booking.com :</p>
                <div className="flex gap-2">
                  <button onClick={handleExportIcal} className="flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/30">
                    <Download className="h-3.5 w-3.5" /> Télécharger .ics
                  </button>
                  <button onClick={handleCopyIcalContent} className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-lg text-sm hover:bg-muted">
                    {copiedExport ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedExport ? "Copié !" : "Copier"}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Collez ce fichier dans les paramètres de calendrier de votre annonce Airbnb/Booking.</p>
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
            <h3 className="font-semibold text-foreground capitalize">{monthLabel}</h3>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => <div key={d} className="text-center text-muted-foreground font-medium py-1">{d}</div>)}
            {calDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const dayBookings = bookingsForDay(day);
              return (
                <div key={i} className={`min-h-[60px] p-1 rounded-lg border text-xs ${dayBookings.length > 0 ? "border-primary/30 bg-primary/5" : "border-border/30"}`}>
                  <span className="text-foreground font-medium">{day}</span>
                  {dayBookings.slice(0, 2).map(b => (
                    <div key={b.id} className="mt-0.5 bg-primary/10 text-primary text-[10px] px-1 rounded truncate">{b.guest_name}</div>
                  ))}
                  {dayBookings.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayBookings.length - 2}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{editingId ? "Modifier la réservation" : "Nouvelle réservation"}</h3>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">Voyageur *</label><input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Bien *</label><select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="">— Sélectionner —</option>{properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Arrivée *</label><input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Départ *</label><input type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Email</label><input value={form.guest_email} onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Téléphone</label><input value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Adresse complète</label><input value={form.guest_address} onChange={e => setForm(f => ({ ...f, guest_address: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Code postal</label><input value={form.guest_postal_code} onChange={e => setForm(f => ({ ...f, guest_postal_code: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Ville</label><input value={form.guest_city} onChange={e => setForm(f => ({ ...f, guest_city: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Pays</label><input value={form.guest_country} onChange={e => setForm(f => ({ ...f, guest_country: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Pièce d'identité</label><select value={form.identity_type} onChange={e => setForm(f => ({ ...f, identity_type: e.target.value as IdentityType }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="none">Aucune</option><option value="cni">CNI</option><option value="passport">Passeport</option></select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">N° CNI / Passeport</label><input value={form.identity_number} onChange={e => setForm(f => ({ ...f, identity_number: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Prix total (€)</label><input type="number" value={form.total_price} onChange={e => setForm(f => ({ ...f, total_price: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Frais ménage (€)</label><input type="number" value={form.cleaning_fee} onChange={e => setForm(f => ({ ...f, cleaning_fee: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium text-foreground mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={save} className="bg-gradient-gold text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">{editingId ? "Enregistrer" : "Ajouter"}</button>
              <button onClick={resetForm} className="border border-border text-foreground px-6 py-2 rounded-lg text-sm hover:bg-muted">Annuler</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? <p className="text-center text-muted-foreground py-8">Chargement…</p> :
            bookings.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune réservation</p> :
              bookings.map(b => (
                <div key={b.id} className="bg-card rounded-xl border border-border/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{b.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{propName(b.property_id)} · {b.check_in} → {b.check_out}</p>
                    {b.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{b.notes}</p>}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full self-start ${b.status === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-green-500/20 text-green-700"}`}>
                    {b.status === "cancelled" ? "Annulée" : "Confirmée"}
                  </span>
                  <p className="text-sm font-bold text-foreground">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(b.total_price)}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(b)} className="text-muted-foreground hover:text-foreground"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => remove(b.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default SeasonalRentals;
