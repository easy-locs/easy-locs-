import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface Booking {
  id: string; property_id: string; guest_name: string; guest_email: string; guest_phone: string;
  check_in: string; check_out: string; total_price: number; cleaning_fee: number;
  deposit_amount: number; status: string; notes: string;
}

interface Property { id: string; label: string; }

const SeasonalRentals = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [form, setForm] = useState({ property_id: "", guest_name: "", guest_email: "", guest_phone: "", check_in: "", check_out: "", total_price: 0, cleaning_fee: 0, deposit_amount: 0, notes: "" });

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

  const save = async () => {
    if (!orgId || !user || !form.guest_name || !form.property_id || !form.check_in || !form.check_out) return;
    const { error } = await supabase.from("seasonal_bookings").insert({
      org_id: orgId, user_id: user.id, ...form,
      property_id: form.property_id, total_price: form.total_price,
      cleaning_fee: form.cleaning_fee, deposit_amount: form.deposit_amount,
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Réservation ajoutée" });
    setShowForm(false);
    setForm({ property_id: "", guest_name: "", guest_email: "", guest_phone: "", check_in: "", check_out: "", total_price: 0, cleaning_fee: 0, deposit_amount: 0, notes: "" });
    await load();
  };

  const remove = async (id: string) => {
    await supabase.from("seasonal_bookings").delete().eq("id", id);
    toast({ title: "Réservation supprimée" });
    await load();
  };

  const propName = (id: string) => properties.find(p => p.id === id)?.label || "—";

  // Calendar grid
  const calDays = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday start
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Location saisonnière</h1>
            <p className="text-sm text-muted-foreground">Réservations et calendrier</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">
            <Plus className="h-4 w-4" /> Réservation
          </button>
        </div>

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
            <h3 className="font-semibold text-foreground">Nouvelle réservation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">Voyageur *</label><input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Bien *</label><select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="">— Sélectionner —</option>{properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Arrivée *</label><input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Départ *</label><input type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Prix total (€)</label><input type="number" value={form.total_price} onChange={e => setForm(f => ({ ...f, total_price: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Frais ménage (€)</label><input type="number" value={form.cleaning_fee} onChange={e => setForm(f => ({ ...f, cleaning_fee: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Email</label><input value={form.guest_email} onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Téléphone</label><input value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={save} className="bg-gradient-gold text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">Enregistrer</button>
              <button onClick={() => setShowForm(false)} className="border border-border text-foreground px-6 py-2 rounded-lg text-sm hover:bg-muted">Annuler</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? <p className="text-center text-muted-foreground py-8">Chargement…</p> :
            bookings.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune réservation</p> :
              bookings.map(b => (
                <div key={b.id} className="bg-card rounded-xl border border-border/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{b.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{propName(b.property_id)} · {b.check_in} → {b.check_out}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(b.total_price)}</p>
                  <button onClick={() => remove(b.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SeasonalRentals;
