import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { fetchExpensesProperties, fetchExpenses, insertExpense, deleteExpense, type ExpenseRecord, type PropertyOption } from "@/repositories/expenses.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { Plus, Trash2, Download, Filter } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
import { PermissionGate } from "@/components/auth/PermissionGate";

type Expense = ExpenseRecord;

const Expenses = () => {
  const countryFilter = useCountryFilter();
  const { user, orgId, userCountry: authCountry } = useAuth();
  const activeCountry = countryFilter || authCountry;
  const { toast } = useToast();
  const { t } = useI18n();
  const fmt = (n: number) => formatCurrency(n, activeCountry);

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
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterProp, setFilterProp] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [form, setForm] = useState({ property_id: "", category: "other", label: "", amount: 0, expense_date: new Date().toISOString().slice(0, 10), supplier: "", notes: "" });

  const load = useCallback(async () => {
    if (!orgId) return;
    const props = await fetchExpensesProperties(orgId, countryFilter);
    setProperties(props);
    const propIds = props.map(p => p.id);
    if (countryFilter && propIds.length > 0) {
      setExpenses(await fetchExpenses(orgId, propIds));
    } else if (!countryFilter) {
      setExpenses(await fetchExpenses(orgId));
    } else {
      setExpenses([]);
    }
    setLoading(false);
  }, [orgId, countryFilter]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!orgId || !user || !form.label) return;
    try {
      await insertExpense({
        org_id: orgId, user_id: user.id, property_id: form.property_id || null,
        category: form.category, label: form.label, amount: form.amount,
        expense_date: form.expense_date, supplier: form.supplier || null, notes: form.notes,
      });
      toast({ title: t("page.expenses.new") });
      setShowForm(false);
      setForm({ property_id: "", category: "other", label: "", amount: 0, expense_date: new Date().toISOString().slice(0, 10), supplier: "", notes: "" });
      await load();
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    await deleteExpense(id);
    toast({ title: t("page.common.delete") });
    await load();
  };

  const filtered = expenses.filter(e => (!filterProp || e.property_id === filterProp) && (!filterCat || e.category === filterCat));
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const propName = (id: string | null) => properties.find(p => p.id === id)?.label || "—";
  const catName = (c: string) => CATEGORIES.find(x => x.value === c)?.label || c;

  // Category totals for mini chart
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([cat, amount]) => ({ cat, label: catName(cat), amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [filtered]);

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel={t("page.expenses.title")}>
      <div className="page-content">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-destructive/10 shrink-0"><Filter className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" /></div>
              {t("page.expenses.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("page.expenses.subtitle")}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => exportToCSV(filtered.map(e => ({ Property: propName(e.property_id), Category: catName(e.category), Label: e.label, Amount: e.amount, Date: e.expense_date, Supplier: e.supplier || "" })), "expenses")} className="btn-secondary btn-sm">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">{t("page.expenses.export")}</span>
            </button>
            <PermissionGate permission="expenses:write">
              <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
                <Plus className="h-4 w-4" /> {t("page.expenses.add")}
              </button>
            </PermissionGate>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
          <select value={filterProp} onChange={e => setFilterProp(e.target.value)} className="form-select w-full sm:w-auto text-sm">
            <option value="">{t("page.expenses.all_properties")}</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="form-select w-full sm:w-auto text-sm">
            <option value="">{t("page.expenses.all_categories")}</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Summary Cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="ui-card relative overflow-hidden group hover:shadow-card-hover transition-all">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm text-muted-foreground">{t("page.expenses.total_filtered")}</p>
            <p className="text-2xl font-bold text-foreground currency-value whitespace-nowrap mt-1">{fmt(total)}</p>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} {t("page.finances.expense_count")}</p>
          </div>
          {categoryTotals.length > 0 && (
            <div className="ui-card">
              <p className="text-sm text-muted-foreground mb-3">{t("page.finances.expenses_category")}</p>
              <div className="space-y-2">
                {categoryTotals.map((ct, i) => (
                  <div key={ct.cat} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-foreground font-medium truncate">{ct.label}</span>
                        <span className="text-muted-foreground">{fmt(ct.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-destructive/70 rounded-full transition-all" style={{ width: `${Math.min(100, (ct.amount / total) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Add form */}
        {showForm && (
          <div className="ui-card mb-4 sm:mb-6 space-y-3 sm:space-y-4 expense-form">
            <h3 className="font-semibold text-foreground">{t("page.expenses.new")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group"><label className="form-label">{t("page.expenses.label")} *</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="form-input" /></div>
              <div className="form-group"><label className="form-label">{t("page.expenses.amount")} *</label><input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} className="form-input" /></div>
              <div className="form-group"><label className="form-label">{t("page.expenses.category")}</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-select">{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div className="form-group"><label className="form-label">{t("page.expenses.property")}</label><select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="form-select"><option value="">{t("page.expenses.none")}</option>{properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div className="form-group"><label className="form-label">{t("page.expenses.date")}</label><input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="form-input" /></div>
              <div className="form-group"><label className="form-label">{t("page.expenses.supplier")}</label><input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="form-input" /></div>
            </div>
            <div className="flex gap-2 sm:gap-3">
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
                    <tr key={e.id} className="table-body-row">
                      <td className="table-cell whitespace-nowrap">{e.expense_date}</td>
                      <td className="table-cell font-medium">{e.label}</td>
                      <td className="table-cell-muted">{catName(e.category)}</td>
                      <td className="table-cell-muted">{propName(e.property_id)}</td>
                      <td className="table-cell-amount">{fmt(e.amount)}</td>
                      <td className="table-cell-actions"><button onClick={() => remove(e.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-4 w-4" /></button></td>
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
