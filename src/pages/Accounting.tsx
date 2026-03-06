import { useState, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, TrendingUp, DollarSign, Download, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getCountryFlag } from "@/lib/global-country-registry";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { getAccountingRules, type CountryAccountingRules } from "@/lib/accounting-rules";
import { COUNTRY_CURRENCY_MAP } from "@/lib/i18n";
import { getCountryProfile, formatPropertyCurrency } from "@/lib/country-profile";

const Accounting = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [newEntry, setNewEntry] = useState({ label: "", category: "other", debit: "", credit: "", transaction_date: format(new Date(), "yyyy-MM-dd"), notes: "", property_id: "" });

  const { data: org } = useQuery({
    queryKey: ["org", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("org_members").select("org_id").eq("user_id", user!.id).limit(1).single();
      if (!data) return null;
      const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
      return o;
    },
    enabled: !!user,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, label, country, monthly_rent, monthly_charges").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  // Get unique countries from properties
  const propertyCountries = useMemo(() => {
    const countries = [...new Set(properties.map((p: any) => p.country || "FR"))];
    return countries.sort();
  }, [properties]);

  // Active accounting rules — STRICTLY from selected country profile
  const activeCountryProfile = useMemo(() => {
    const code = selectedCountry !== "all" ? selectedCountry : (org?.country || "FR");
    return getCountryProfile(code);
  }, [selectedCountry, org]);

  const activeRules: CountryAccountingRules = activeCountryProfile.accounting;

  const categories = useMemo(() => {
    return Object.entries(activeRules.categoryLabels).map(([value, label]) => ({ value, label }));
  }, [activeRules]);

  const { data: journal = [] } = useQuery({
    queryKey: ["journal", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("transaction_journal" as any).select("*").eq("org_id", org!.id).order("transaction_date", { ascending: false }).limit(500);
      return (data || []) as unknown as Array<{
        id: string; label: string; category: string; debit: number; credit: number;
        transaction_date: string; currency: string; notes: string; source_type: string;
        property_id: string | null; created_at: string;
      }>;
    },
    enabled: !!org,
  });

  const { data: rentCalls = [] } = useQuery({
    queryKey: ["rent_calls", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rent_calls").select("*").eq("org_id", org!.id).eq("paid", true);
      return data || [];
    },
    enabled: !!org,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  // Filter by country (match property_id → country)
  const countryFilteredProperties = useMemo(() => {
    if (selectedCountry === "all") return properties;
    return properties.filter((p: any) => (p.country || "FR") === selectedCountry);
  }, [properties, selectedCountry]);

  const countryPropertyIds = useMemo(() => new Set(countryFilteredProperties.map((p: any) => p.id)), [countryFilteredProperties]);

  const allTransactions = useMemo(() => {
    const manual = journal.map(j => ({
      id: j.id, date: j.transaction_date, label: j.label, category: j.category,
      debit: Number(j.debit), credit: Number(j.credit), source: "manual" as const, currency: j.currency,
      property_id: j.property_id,
    }));
    const rents = rentCalls.map((r: any) => ({
      id: `rc-${r.id}`, date: r.paid_date || r.month, label: `${activeRules.categoryLabels.rent || "Rent"} ${r.month}`,
      category: "rent", debit: 0, credit: Number(r.total_amount), source: "auto" as const, currency: activeRules.currency,
      property_id: r.property_id,
    }));
    const exps = expenses.map((e: any) => ({
      id: `ex-${e.id}`, date: e.expense_date, label: e.label,
      category: e.category, debit: Number(e.amount), credit: 0, source: "auto" as const, currency: activeRules.currency,
      property_id: e.property_id,
    }));
    let all = [...manual, ...rents, ...exps];
    // STRICT COUNTRY ISOLATION: when a country is selected, only show
    // transactions from properties in that country. Unlinked transactions
    // are excluded to prevent cross-country contamination.
    if (selectedCountry !== "all") {
      all = all.filter(tx => tx.property_id && countryPropertyIds.has(tx.property_id));
    }
    all.sort((a, b) => b.date.localeCompare(a.date));
    return filterCat === "all" ? all : all.filter(t => t.category === filterCat);
  }, [journal, rentCalls, expenses, filterCat, selectedCountry, countryPropertyIds, activeRules]);

  const now = new Date();
  const thisMonth = allTransactions.filter(t => {
    try { return parseISO(t.date) >= startOfMonth(now) && parseISO(t.date) <= endOfMonth(now); } catch { return false; }
  });
  const totalCredits = thisMonth.reduce((s, t) => s + t.credit, 0);
  const totalDebits = thisMonth.reduce((s, t) => s + t.debit, 0);
  const netIncome = totalCredits - totalDebits;

  const cashflowData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const m = subMonths(now, 5 - i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const mTx = allTransactions.filter(t => {
        try { const d = parseISO(t.date); return d >= mStart && d <= mEnd; } catch { return false; }
      });
      return {
        month: format(m, "MMM"),
        revenus: mTx.reduce((s, t) => s + t.credit, 0),
        depenses: mTx.reduce((s, t) => s + t.debit, 0),
        net: mTx.reduce((s, t) => s + t.credit - t.debit, 0),
      };
    });
  }, [allTransactions]);

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transaction_journal" as any).insert({
        org_id: org!.id, user_id: user!.id,
        label: newEntry.label, category: newEntry.category,
        debit: Number(newEntry.debit) || 0, credit: Number(newEntry.credit) || 0,
        transaction_date: newEntry.transaction_date, notes: newEntry.notes,
        property_id: newEntry.property_id || null, source_type: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("page.accounting.entry_added") || "Écriture ajoutée");
      qc.invalidateQueries({ queryKey: ["journal"] });
      setAddOpen(false);
      setNewEntry({ label: "", category: "other", debit: "", credit: "", transaction_date: format(new Date(), "yyyy-MM-dd"), notes: "", property_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCSV = () => {
    const sym = activeRules.currencySymbol;
    const headers = `Date,${t("page.accounting.label") || "Libellé"},${t("page.accounting.category") || "Catégorie"},${t("page.accounting.debit") || "Débit"},${t("page.accounting.credit") || "Crédit"},Source\n`;
    const rows = allTransactions.map(t => `${t.date},"${t.label}",${t.category},${t.debit},${t.credit},${t.source}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `comptabilite-${selectedCountry !== "all" ? selectedCountry + "-" : ""}${format(now, "yyyy-MM")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sym = activeRules.currencySymbol;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.accounting.title") || "Comptabilité"}</h1>
            <p className="text-muted-foreground text-sm">{t("page.accounting.subtitle") || "Journal, cashflow et rapports financiers"}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Country filter */}
            {propertyCountries.length > 1 && (
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[160px]">
                  <span className="mr-1">{selectedCountry === "all" ? "🌍" : getCountryFlag(selectedCountry)}</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌍 {t("common.all_countries") || "Tous les pays"}</SelectItem>
                  {propertyCountries.map(c => (
                    <SelectItem key={c} value={c}>{getCountryFlag(c)} {c} — {COUNTRY_CURRENCY_MAP[c] || "EUR"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t("page.accounting.new_entry") || "Nouvelle écriture"}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("page.accounting.new_entry") || "Nouvelle écriture comptable"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder={t("page.accounting.label") || "Libellé"} value={newEntry.label} onChange={e => setNewEntry(p => ({ ...p, label: e.target.value }))} />
                  <Select value={newEntry.category} onValueChange={v => setNewEntry(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder={`${t("page.accounting.debit") || "Débit"} (${sym})`} value={newEntry.debit} onChange={e => setNewEntry(p => ({ ...p, debit: e.target.value }))} />
                    <Input type="number" placeholder={`${t("page.accounting.credit") || "Crédit"} (${sym})`} value={newEntry.credit} onChange={e => setNewEntry(p => ({ ...p, credit: e.target.value }))} />
                  </div>
                  <Input type="date" value={newEntry.transaction_date} onChange={e => setNewEntry(p => ({ ...p, transaction_date: e.target.value }))} />
                  <Select value={newEntry.property_id || "none"} onValueChange={v => setNewEntry(p => ({ ...p, property_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder={t("page.accounting.property_optional") || "Bien (optionnel)"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— {t("common.none") || "Aucun"} —</SelectItem>
                      {countryFilteredProperties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Notes" value={newEntry.notes} onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))} />
                  {/* Show fiscal info */}
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground text-sm">{t("page.accounting.fiscal_info") || "Infos fiscales"} — {activeRules.country}</p>
                    {activeRules.rentalIncomeTax.type === "flat" && <p>📊 {t("page.accounting.flat_tax") || "Taux forfaitaire"}: {activeRules.rentalIncomeTax.rate}%{activeRules.rentalIncomeTax.bracket ? ` (${activeRules.rentalIncomeTax.bracket})` : ""}</p>}
                    {activeRules.rentalIncomeTax.type === "progressive" && <p>📊 {t("page.accounting.progressive_tax") || "Imposition progressive"}</p>}
                    {activeRules.rentalIncomeTax.type === "exempt" && <p>✅ {t("page.accounting.tax_exempt") || "Exonéré d'impôt sur les revenus locatifs"}</p>}
                    {activeRules.socialCharges && <p>💰 {t("page.accounting.social_charges") || "Prélèvements sociaux"}: {activeRules.socialCharges}%</p>}
                    {activeRules.depositCap && <p>🏦 {t("page.accounting.deposit_cap") || "Plafond dépôt"}: {activeRules.depositCap}</p>}
                    {activeRules.vatApplicable && <p>📋 TVA/VAT: {activeRules.vatRates.standard}%</p>}
                  </div>
                  <Button className="w-full" onClick={() => addMut.mutate()} disabled={!newEntry.label || addMut.isPending}>
                    {addMut.isPending ? "..." : t("common.save") || "Enregistrer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">{t("page.accounting.revenue_month") || "Revenus (mois)"}</span></div>
            <p className="text-2xl font-bold text-accent">{totalCredits.toLocaleString()} {sym}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground uppercase">{t("page.accounting.expenses_month") || "Dépenses (mois)"}</span></div>
            <p className="text-2xl font-bold text-destructive">{totalDebits.toLocaleString()} {sym}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-foreground" /><span className="text-xs text-muted-foreground uppercase">{t("page.accounting.net_result") || "Résultat net"}</span></div>
            <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-accent" : "text-destructive"}`}>{netIncome.toLocaleString()} {sym}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-foreground" /><span className="text-xs text-muted-foreground uppercase">{t("page.accounting.total_entries") || "Écritures"}</span></div>
            <p className="text-2xl font-bold text-foreground">{allTransactions.length}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="journal">
          <TabsList>
            <TabsTrigger value="journal"><BookOpen className="h-4 w-4 mr-1" />{t("page.accounting.journal") || "Journal"}</TabsTrigger>
            <TabsTrigger value="cashflow"><TrendingUp className="h-4 w-4 mr-1" />Cashflow</TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{t("page.accounting.transaction_journal") || "Journal des transactions"}</CardTitle>
                <Select value={filterCat} onValueChange={setFilterCat}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("page.accounting.all_categories") || "Toutes catégories"}</SelectItem>
                    {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">{t("page.accounting.label") || "Libellé"}</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">{t("page.accounting.category") || "Catégorie"}</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">{t("page.accounting.debit") || "Débit"}</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">{t("page.accounting.credit") || "Crédit"}</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Source</th>
                    </tr></thead>
                    <tbody>
                      {allTransactions.slice(0, 100).map(tx => (
                        <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 text-muted-foreground">{tx.date}</td>
                          <td className="py-2 font-medium text-foreground">{tx.label}</td>
                          <td className="py-2"><Badge variant="outline" className="text-xs">{activeRules.categoryLabels[tx.category] || tx.category}</Badge></td>
                          <td className="py-2 text-right">{tx.debit > 0 ? <span className="text-destructive">{tx.debit.toLocaleString()} {sym}</span> : "—"}</td>
                          <td className="py-2 text-right">{tx.credit > 0 ? <span className="text-accent">{tx.credit.toLocaleString()} {sym}</span> : "—"}</td>
                          <td className="py-2 text-center"><Badge variant={tx.source === "auto" ? "secondary" : "default"} className="text-[10px]">{tx.source === "auto" ? "Auto" : "Manual"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashflow" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Cashflow — {t("page.accounting.last_6_months") || "6 derniers mois"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={cashflowData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="revenus" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name={t("page.accounting.revenue") || "Revenus"} />
                    <Bar dataKey="depenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name={t("page.accounting.expenses") || "Dépenses"} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-2">{t("page.accounting.net_monthly") || "Résultat net mensuel"}</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={cashflowData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="net" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} name="Net" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Accounting;
