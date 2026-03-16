import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FeatureGate from "@/components/subscription/FeatureGate";
import { useAuth } from "@/contexts/AuthContext";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { exportToCSV } from "@/lib/csv-export";
import { downloadFinancialPDF, type ReportSummary } from "@/lib/pdf-report";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { format, subMonths } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, PiggyBank, Download, FileText, BarChart3,
  ArrowUpRight, ArrowDownRight, Loader2, Home, Percent,
} from "lucide-react";

const COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
];

interface RentCall {
  month: string;
  rent_amount: number;
  charges_amount: number;
  total_amount: number;
  paid: boolean | null;
  property_id: string | null;
}

interface Expense {
  label: string;
  amount: number;
  category: string;
  expense_date: string;
  property_id: string | null;
}

interface Property {
  id: string;
  label: string;
  country: string;
}

const ReportingDashboard = () => {
  const { orgId, userCountry } = useAuth();
  const countryFilter = useCountryFilter();
  const { t, locale } = useI18n();
  const dateFnsLocale = locale === "fr" ? fr : enUS;

  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const activeCountry = countryFilter || userCountry || "FR";
  const fmt = (n: number) => formatCurrency(n, activeCountry);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      setLoading(true);
      let propQ = supabase.from("properties").select("id, label, country").eq("org_id", orgId);
      if (countryFilter) propQ = propQ.eq("country", countryFilter);
      const [{ data: props }, { data: rc }, { data: exp }] = await Promise.all([
        propQ,
        supabase.from("rent_calls").select("month, rent_amount, charges_amount, total_amount, paid, property_id").eq("org_id", orgId),
        supabase.from("expenses").select("label, amount, category, expense_date, property_id").eq("org_id", orgId),
      ]);
      const p = (props || []) as Property[];
      setProperties(p);
      const pIds = new Set(p.map(pr => pr.id));
      setRentCalls(countryFilter ? (rc || []).filter((r: any) => r.property_id && pIds.has(r.property_id)) : (rc || []));
      setExpenses(countryFilter ? (exp || []).filter((e: any) => e.property_id && pIds.has(e.property_id)) : (exp || []));
      setLoading(false);
    };
    load();
  }, [orgId, countryFilter]);

  const yearCalls = useMemo(() => rentCalls.filter(r => r.month?.startsWith(String(year))), [rentCalls, year]);
  const yearExpenses = useMemo(() => expenses.filter(e => e.expense_date?.startsWith(String(year))), [expenses, year]);

  const totalRevenue = useMemo(() => yearCalls.reduce((s, r) => s + Number(r.total_amount || 0), 0), [yearCalls]);
  const totalCollected = useMemo(() => yearCalls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount || 0), 0), [yearCalls]);
  const totalUnpaid = totalRevenue - totalCollected;
  const totalExpenses = useMemo(() => yearExpenses.reduce((s, e) => s + Number(e.amount || 0), 0), [yearExpenses]);
  const netIncome = totalCollected - totalExpenses;
  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; collected: number; expenses: number }> = {};
    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, "0")}`;
      const label = format(new Date(year, m, 1), "MMM", { locale: dateFnsLocale });
      months[key] = { month: label, collected: 0, expenses: 0 };
    }
    yearCalls.filter(r => r.paid).forEach(r => {
      const k = r.month?.slice(0, 7);
      if (k && months[k]) months[k].collected += Number(r.total_amount || 0);
    });
    yearExpenses.forEach(e => {
      const k = e.expense_date?.slice(0, 7);
      if (k && months[k]) months[k].expenses += Number(e.amount || 0);
    });
    return Object.values(months);
  }, [yearCalls, yearExpenses, year, dateFnsLocale]);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    yearExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [yearExpenses]);

  // Per-property summary
  const propertyRows = useMemo(() => {
    return properties.map(p => {
      const pCalls = yearCalls.filter(r => r.property_id === p.id);
      const revenue = pCalls.reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const collected = pCalls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const pExp = yearExpenses.filter(e => e.property_id === p.id).reduce((s, e) => s + Number(e.amount || 0), 0);
      return { label: p.label, country: p.country, revenue, collected, expenses: pExp, net: collected - pExp };
    }).sort((a, b) => b.net - a.net);
  }, [properties, yearCalls, yearExpenses]);

  const chartConfig = {
    collected: { label: t("page.reporting.collected"), color: "hsl(var(--accent))" },
    expenses: { label: t("page.reporting.expenses"), color: "hsl(var(--destructive))" },
  };

  const handleExportCSV = () => {
    exportToCSV(
      propertyRows.map(r => ({ ...r })) as any,
      `rapport-financier-${year}`,
      [
        { key: "label", label: t("page.reporting.property") },
        { key: "country", label: t("page.reporting.country") },
        { key: "revenue", label: t("page.reporting.revenue") },
        { key: "collected", label: t("page.reporting.collected") },
        { key: "expenses", label: t("page.reporting.expenses") },
        { key: "net", label: t("page.reporting.net_income") },
      ]
    );
  };

  const handleExportPDF = () => {
    const report: ReportSummary = {
      title: `${t("page.reporting.title")} ${year}`,
      period: String(year),
      generatedAt: new Date().toLocaleDateString(),
      currency: activeCountry === "US" ? "USD" : activeCountry === "GB" ? "GBP" : activeCountry === "MA" ? "MAD" : "EUR",
      totalRevenue,
      totalCollected,
      totalUnpaid,
      totalExpenses,
      netIncome,
      collectionRate,
      properties: propertyRows,
      expensesByCategory,
      monthlyBreakdown: monthlyData,
    };
    downloadFinancialPDF(report);
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel="Reporting">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <div className="p-1.5 sm:p-2 rounded-xl bg-accent/10 shrink-0">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
                {t("page.reporting.title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t("page.reporting.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
              </select>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1.5" /> CSV
              </Button>
              <Button variant="default" size="sm" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-1.5" /> PDF
              </Button>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t("page.common.loading") || "Loading…"}
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <StatCard icon={TrendingUp} iconClassName="text-accent" label={t("page.reporting.expected_revenue")} value={fmt(totalRevenue)} />
                <StatCard icon={ArrowUpRight} iconClassName="text-primary" label={t("page.reporting.collected")} value={fmt(totalCollected)} />
                <StatCard icon={ArrowDownRight} iconClassName="text-destructive" label={t("page.reporting.unpaid")} value={fmt(totalUnpaid)} />
                <StatCard icon={TrendingDown} iconClassName="text-destructive" label={t("page.reporting.expenses")} value={fmt(totalExpenses)} />
                <StatCard icon={PiggyBank} iconClassName={netIncome >= 0 ? "text-accent" : "text-destructive"} label={t("page.reporting.net_income")} value={fmt(netIncome)} />
                <StatCard icon={Percent} iconClassName="text-primary" label={t("page.reporting.collection_rate")} value={`${collectionRate.toFixed(1)}%`} />
              </div>

              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                  <TabsTrigger value="properties">Par bien</TabsTrigger>
                  <TabsTrigger value="expenses">Dépenses</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Évolution mensuelle</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[280px] w-full">
                        <BarChart data={monthlyData} barCategoryGap="20%">
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="collected" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Properties Tab */}
                <TabsContent value="properties" className="space-y-3">
                  {propertyRows.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
                      <Home className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Aucun bien pour cette période
                    </CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {propertyRows.map((p, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <Card>
                            <CardContent className="py-3 px-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-foreground truncate">{p.label}</p>
                                  <p className="text-xs text-muted-foreground">{p.country}</p>
                                </div>
                                <div className="flex items-center gap-4 text-right text-xs shrink-0">
                                  <div>
                                    <p className="text-muted-foreground">Encaissé</p>
                                    <p className="font-medium text-foreground">{fmt(p.collected)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Dépenses</p>
                                    <p className="font-medium text-foreground">{fmt(p.expenses)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Net</p>
                                    <p className={`font-bold ${p.net >= 0 ? "text-accent" : "text-destructive"}`}>{fmt(p.net)}</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses" className="space-y-4">
                  {expensesByCategory.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
                      Aucune dépense enregistrée pour {year}
                    </CardContent></Card>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader><CardTitle className="text-base">Répartition</CardTitle></CardHeader>
                        <CardContent>
                          <ChartContainer config={{}} className="h-[250px] w-full">
                            <PieChart>
                              <Pie
                                data={expensesByCategory}
                                dataKey="amount"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name }) => name}
                              >
                                {expensesByCategory.map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip />
                            </PieChart>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-base">Détail</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {expensesByCategory.map((cat, i) => {
                            const maxAmt = expensesByCategory[0]?.amount || 1;
                            const pct = (cat.amount / maxAmt) * 100;
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-24 truncate">{cat.category}</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.05 }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-foreground w-20 text-right">{fmt(cat.amount)}</span>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default ReportingDashboard;
