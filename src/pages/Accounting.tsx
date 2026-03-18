import { useState, useMemo } from "react";
import PropertyHubBreadcrumb from "@/components/property/PropertyHubBreadcrumb";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
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
  const countryFilter = useCountryFilter();
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  // Country is enforced by CountryGuard — no internal selector needed
  const selectedCountry = countryFilter || "FR";
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
    queryKey: ["properties", org?.id, countryFilter],
    queryFn: async () => {
      let query = supabase.from("properties").select("id, label, country, monthly_rent, monthly_charges").eq("org_id", org!.id);
      if (countryFilter) query = query.eq("country", countryFilter);
      const { data } = await query;
      return data || [];
    },
    enabled: !!org,
  });

  // Active accounting rules — STRICTLY from country context
  const activeCountryProfile = useMemo(() => {
    return getCountryProfile(selectedCountry);
  }, [selectedCountry]);

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

  // Filter properties by country context
  const countryFilteredProperties = useMemo(() => {
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
    // STRICT COUNTRY ISOLATION: only show transactions from properties in this country
    all = all.filter(tx => tx.property_id && countryPropertyIds.has(tx.property_id));
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
      // STRICT: Require a property to ensure correct country ledger isolation
      if (!newEntry.property_id) {
        throw new Error("A property must be selected to ensure correct country ledger isolation.");
      }
      // Determine currency from the linked property
      const linkedProp = properties.find((p: any) => p.id === newEntry.property_id);
      const entryCurrency = linkedProp ? (COUNTRY_CURRENCY_MAP[linkedProp.country] || "EUR") : activeRules.currency;

      const { error } = await supabase.from("transaction_journal" as any).insert({
        org_id: org!.id, user_id: user!.id,
        label: newEntry.label, category: newEntry.category,
        debit: Number(newEntry.debit) || 0, credit: Number(newEntry.credit) || 0,
        transaction_date: newEntry.transaction_date, notes: newEntry.notes,
        property_id: newEntry.property_id || null, source_type: "manual",
        currency: entryCurrency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("page.accounting.entry_added") || "Entry added");
      qc.invalidateQueries({ queryKey: ["journal"] });
      setAddOpen(false);
      setNewEntry({ label: "", category: "other", debit: "", credit: "", transaction_date: format(new Date(), "yyyy-MM-dd"), notes: "", property_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCSV = () => {
    const sym = activeRules.currencySymbol;
    const headers = `Date,${t("page.accounting.label") || "Label"},${t("page.accounting.category") || "Category"},${t("page.accounting.debit") || "Debit"},${t("page.accounting.credit") || "Credit"},Source\n`;
    const rows = allTransactions.map(t => `${t.date},"${t.label}",${t.category},${t.debit},${t.credit},${t.source}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `comptabilite-${selectedCountry}-${format(now, "yyyy-MM")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sym = activeRules.currencySymbol;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.accounting.title") || "Accounting"}</h1>
            <p className="text-muted-foreground text-sm">{t("page.accounting.subtitle") || "Journal, cashflow and financial reports"}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
              <span className="text-lg">{getCountryFlag(selectedCountry)}</span>
              <span className="font-medium text-foreground">{selectedCountry} — {COUNTRY_CURRENCY_MAP[selectedCountry] || "EUR"}</span>
            </div>
            <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t("page.accounting.new_entry") || "New Entry"}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("page.accounting.new_entry") || "New Accounting Entry"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder={t("page.accounting.label") || "Label"} value={newEntry.label} onChange={e => setNewEntry(p => ({ ...p, label: e.target.value }))} />
                  <Select value={newEntry.category} onValueChange={v => setNewEntry(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder={`${t("page.accounting.debit") || "Debit"} (${sym})`} value={newEntry.debit} onChange={e => setNewEntry(p => ({ ...p, debit: e.target.value }))} />
                    <Input type="number" placeholder={`${t("page.accounting.credit") || "Credit"} (${sym})`} value={newEntry.credit} onChange={e => setNewEntry(p => ({ ...p, credit: e.target.value }))} />
                  </div>
                  <Input type="date" value={newEntry.transaction_date} onChange={e => setNewEntry(p => ({ ...p, transaction_date: e.target.value }))} />
                  <Select value={newEntry.property_id || "none"} onValueChange={v => setNewEntry(p => ({ ...p, property_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder={t("page.accounting.property_optional") || "Property (optional)"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— {t("common.none") || "None"} —</SelectItem>
                      {countryFilteredProperties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Notes" value={newEntry.notes} onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))} />
                  {/* Show fiscal info */}
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground text-sm">{t("page.accounting.fiscal_info") || "Fiscal info"} — {activeRules.country}</p>
                    {activeRules.rentalIncomeTax.type === "flat" && <p>📊 {t("page.accounting.flat_tax") || "Flat tax rate"}: {activeRules.rentalIncomeTax.rate}%{activeRules.rentalIncomeTax.bracket ? ` (${activeRules.rentalIncomeTax.bracket})` : ""}</p>}
                    {activeRules.rentalIncomeTax.type === "progressive" && <p>📊 {t("page.accounting.progressive_tax") || "Progressive taxation"}</p>}
                    {activeRules.rentalIncomeTax.type === "exempt" && <p>✅ {t("page.accounting.tax_exempt") || "Exempt from rental income tax"}</p>}
                    {activeRules.socialCharges && <p>💰 {t("page.accounting.social_charges") || "Social charges"}: {activeRules.socialCharges}%</p>}
                    {activeRules.depositCap && <p>🏦 {t("page.accounting.deposit_cap") || "Deposit cap"}: {activeRules.depositCap}</p>}
                    {activeRules.vatApplicable && <p>📋 TVA/VAT: {activeRules.vatRates.standard}%</p>}
                  </div>
                  <Button className="w-full" onClick={() => addMut.mutate()} disabled={!newEntry.label || addMut.isPending}>
                    {addMut.isPending ? "..." : t("common.save") || "Save"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ArrowUpRight} iconClassName="text-accent" label={t("page.accounting.revenue_month")} value={`${totalCredits.toLocaleString()} ${sym}`} />
          <StatCard icon={ArrowDownRight} iconClassName="text-destructive" label={t("page.accounting.expenses_month")} value={`${totalDebits.toLocaleString()} ${sym}`} valueClassName="text-destructive" />
          <StatCard icon={DollarSign} label={t("page.accounting.net_result")} value={`${netIncome.toLocaleString()} ${sym}`} valueClassName={netIncome >= 0 ? "text-accent" : "text-destructive"} />
          <StatCard icon={BookOpen} label={t("page.accounting.total_entries")} value={String(allTransactions.length)} />
        </div>

        <Tabs defaultValue="journal">
          <TabsList>
            <TabsTrigger value="journal"><BookOpen className="h-4 w-4 mr-1" />{t("page.accounting.journal") || "Journal"}</TabsTrigger>
            <TabsTrigger value="cashflow"><TrendingUp className="h-4 w-4 mr-1" />Cashflow</TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{t("page.accounting.transaction_journal") || "Transaction Journal"}</CardTitle>
                <Select value={filterCat} onValueChange={setFilterCat}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("page.accounting.all_categories") || "All categories"}</SelectItem>
                    {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Date</th>
                      <th className="text-left py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">{t("page.accounting.label")}</th>
                      <th className="text-left py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">{t("page.accounting.category")}</th>
                      <th className="text-right py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">{t("page.accounting.debit")}</th>
                      <th className="text-right py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">{t("page.accounting.credit")}</th>
                      <th className="text-center py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Source</th>
                    </tr></thead>
                    <tbody>
                      {allTransactions.slice(0, 100).map(tx => (
                        <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{tx.date}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground max-w-[200px] truncate">{tx.label}</td>
                          <td className="py-2.5 px-3"><Badge variant="outline" className="text-xs whitespace-nowrap h-6 px-2.5">{activeRules.categoryLabels[tx.category] || tx.category}</Badge></td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">{tx.debit > 0 ? <span className="text-destructive">{tx.debit.toLocaleString()} {sym}</span> : "—"}</td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">{tx.credit > 0 ? <span className="text-accent">{tx.credit.toLocaleString()} {sym}</span> : "—"}</td>
                          <td className="py-2.5 px-3 text-center"><Badge variant={tx.source === "auto" ? "secondary" : "default"} className="text-[10px] whitespace-nowrap h-5 px-2">{tx.source === "auto" ? "Auto" : "Manual"}</Badge></td>
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
              <CardHeader><CardTitle className="text-lg">Cashflow — {t("page.accounting.last_6_months") || "Last 6 months"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={cashflowData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="revenus" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name={t("page.accounting.revenue") || "Revenue"} />
                    <Bar dataKey="depenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name={t("page.accounting.expenses") || "Expenses"} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-2">{t("page.accounting.net_monthly") || "Monthly net result"}</h4>
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
