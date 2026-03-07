import { useState, useEffect, useCallback } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { Plus, Trash2, Download, Filter } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

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
  const { user, orgId, userCountry } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const fmt = (n: number) => formatCurrency(n, userCountry);

  const CATEGORIES = [
    { value: "travaux", label: t("page.finances.cat_travaux") },
    { value: "assurance", label: t("page.finances.cat_assurance") },
    { value: "taxe_fonciere", label: t("page.finances.cat_taxe_fonciere") },
    { value: "charges_copro", label: t("page.finances.cat_charges_copro") },
    { value: "interet_emprunt", label: t("page.finances.cat_interet") },
    { value: "frais_gestion", label: t("page.finances.cat_gestion") },
    { value: "diagnostics", label: t("page.finances.cat_diagnostics") },
    { value: "honoraires", label: t("page.finances.cat_honoraires") },
    { value: "other", label: t("page.finances.cat_other") },
  ];

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
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("page.expenses.new") });
    setShowForm(false);
    setForm({ property_id: "", category: "other", label: "", amount: 0, expense_date: new Date().toISOString().slice(0, 10), supplier: "", notes: "" });
    await load();
  };

  const remove = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    toast({ title: t("page.common.delete") });
    await load();
  };

  const filtered = expenses.filter(e => (!filterProp || e.property_id === filterProp) && (!filterCat || e.category === filterCat));
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const propName = (id: string | null) => properties.find(p => p.id === id)?.label || "—";
  const catName = (c: string) => CATEGORIES.find(x => x.value === c)?.label || c;

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel={t("page.expenses.title")}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="page-header mb-0">
            <h1>{t("page.expenses.title")}</h1>
            <p>{t("page.expenses.subtitle")}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => exportToCSV(filtered.map(e => ({ Property: propName(e.property_id), Category: catName(e.category), Label: e.label, Amount: e.amount, Date: e.expense_date, Supplier: e.supplier || "" })), "expenses")} className="btn-secondary btn-sm">
              <Download className="h-4 w-4" /> {t("page.expenses.export")}
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> {t("page.expenses.add")}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <select value={filterProp} onChange={e => setFilterProp(e.target.value)} className="form-select w-auto">
            <option value="">{t("page.expenses.all_properties")}</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="form-select w-auto">
            <option value="">{t("page.expenses.all_categories")}</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Summary */}
        <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
          <p className="text-sm text-muted-foreground">{t("page.expenses.total_filtered")}</p>
          <p className="text-2xl font-bold text-foreground currency-value whitespace-nowrap">{fmt(total)}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} {t("page.finances.expense_count")}</p>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <h3 className="font-semibold text-foreground">{t("page.expenses.new")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.expenses.label")} *</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.expenses.amount")} *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.expenses.category")}</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.expenses.property")}</label><select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="">{t("page.expenses.none")}</option>{properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.expenses.date")}</label><input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.expenses.supplier")}</label><input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={save} className="btn-primary">{t("page.common.save")}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">{t("page.common.cancel")}</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="table-container">
          <div className="table-scroll">
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="table-head-row">
              <th className="table-head-cell">{t("page.expenses.date")}</th>
              <th className="table-head-cell">{t("page.expenses.label")}</th>
              <th className="table-head-cell">{t("page.expenses.category")}</th>
              <th className="table-head-cell">{t("page.expenses.property")}</th>
              <th className="table-head-cell text-right">{t("page.expenses.amount")}</th>
              <th className="table-head-cell"></th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("page.common.loading")}</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("page.expenses.no_expense")}</td></tr> :
                  filtered.map(e => (
                    <tr key={e.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground">{e.expense_date}</td>
                      <td className="px-4 py-3 text-foreground font-medium">{e.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{catName(e.category)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{propName(e.property_id)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold currency-value whitespace-nowrap">{fmt(e.amount)}</td>
                      <td className="px-4 py-3"><button onClick={() => remove(e.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Expenses;
