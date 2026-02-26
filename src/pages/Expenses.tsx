import { useState, useEffect, useCallback } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, Filter } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

const CATEGORIES = [
  { value: "travaux", label: "Travaux / Réparations" },
  { value: "assurance", label: "Assurance" },
  { value: "taxe_fonciere", label: "Taxe foncière" },
  { value: "charges_copro", label: "Charges copropriété" },
  { value: "interet_emprunt", label: "Intérêts d'emprunt" },
  { value: "frais_gestion", label: "Frais de gestion" },
  { value: "diagnostics", label: "Diagnostics" },
  { value: "honoraires", label: "Honoraires (notaire, avocat)" },
  { value: "other", label: "Autre" },
];

interface Expense {
  id: string;
  property_id: string | null;
  category: string;
  label: string;
  amount: number;
  expense_date: string;
  supplier: string | null;
  notes: string;
}

interface Property { id: string; label: string; }

const Expenses = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterProp, setFilterProp] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [form, setForm] = useState({ property_id: "", category: "other", label: "", amount: 0, expense_date: new Date().toISOString().slice(0, 10), supplier: "", notes: "" });

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: e }, { data: p }] = await Promise.all([
      supabase.from("expenses").select("*").eq("org_id", orgId).order("expense_date", { ascending: false }),
      supabase.from("properties").select("id, label").eq("org_id", orgId).order("label"),
    ]);
    if (e) setExpenses(e as Expense[]);
    if (p) setProperties(p);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!orgId || !user || !form.label) return;
    const { error } = await supabase.from("expenses").insert({
      org_id: orgId, user_id: user.id, property_id: form.property_id || null,
      category: form.category, label: form.label, amount: form.amount,
      expense_date: form.expense_date, supplier: form.supplier || null, notes: form.notes,
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Dépense ajoutée" });
    setShowForm(false);
    setForm({ property_id: "", category: "other", label: "", amount: 0, expense_date: new Date().toISOString().slice(0, 10), supplier: "", notes: "" });
    await load();
  };

  const remove = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    toast({ title: "Dépense supprimée" });
    await load();
  };

  const filtered = expenses.filter(e => (!filterProp || e.property_id === filterProp) && (!filterCat || e.category === filterCat));
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const propName = (id: string | null) => properties.find(p => p.id === id)?.label || "—";
  const catName = (c: string) => CATEGORIES.find(x => x.value === c)?.label || c;

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel="Dépenses">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comptabilité dépenses</h1>
            <p className="text-sm text-muted-foreground">Suivi des dépenses par bien et catégorie</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportToCSV(filtered.map(e => ({ Bien: propName(e.property_id), Catégorie: catName(e.category), Libellé: e.label, Montant: e.amount, Date: e.expense_date, Fournisseur: e.supplier || "" })), "depenses")} className="flex items-center gap-2 border border-border text-foreground px-3 py-2 rounded-lg text-sm hover:bg-muted">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <select value={filterProp} onChange={e => setFilterProp(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Tous les biens</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Summary */}
        <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
          <p className="text-sm text-muted-foreground">Total dépenses filtrées</p>
          <p className="text-2xl font-bold text-foreground">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(total)}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} dépense(s)</p>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <h3 className="font-semibold text-foreground">Nouvelle dépense</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">Libellé *</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Montant (€) *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Catégorie</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Bien</label><select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="">— Aucun —</option>{properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Date</label><input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Fournisseur</label><input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={save} className="bg-gradient-gold text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">Enregistrer</button>
              <button onClick={() => setShowForm(false)} className="border border-border text-foreground px-6 py-2 rounded-lg text-sm hover:bg-muted">Annuler</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Libellé</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Catégorie</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bien</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Montant</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Chargement…</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucune dépense</td></tr> :
                  filtered.map(e => (
                    <tr key={e.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground">{e.expense_date}</td>
                      <td className="px-4 py-3 text-foreground font-medium">{e.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{catName(e.category)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{propName(e.property_id)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(e.amount)}</td>
                      <td className="px-4 py-3"><button onClick={() => remove(e.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Expenses;
