import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, CreditCard, CheckCircle, Loader2, ExternalLink, AlertTriangle, Link2, BarChart3, Download, Home, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Link, useSearchParams } from "react-router-dom";
import { exportToCSV } from "@/lib/csv-export";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths } from "date-fns";
import { fr, enUS, es, de, it, pt } from "@/lib/date-locales";
import type { Locale as DateFnsLocale } from "@/lib/date-locales";
import { formatCurrency } from "@/lib/country-config";

const DATE_LOCALES: Record<string, DateFnsLocale> = { fr, en: enUS, es, de, it, pt };

interface ConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
}

interface RentCall {
  id: string;
  month: string;
  rent_amount: number;
  charges_amount: number;
  total_amount: number;
  paid: boolean | null;
  paid_date: string | null;
  tenant_id: string;
  property_id: string | null;
  payment_status?: string;
  payment_method?: string | null;
}

interface Expense {
  id: string;
  label: string;
  amount: number;
  category: string;
  expense_date: string;
  property_id: string | null;
}

interface Property {
  id: string;
  label: string;
}

const COLORS = ["hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const Finances = () => {
  const countryFilter = useCountryFilter();
  const { user, orgId, userCountry: authCountry } = useAuth();
  const activeCountry = countryFilter || authCountry;
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const dateFnsLocale = DATE_LOCALES[locale] || fr;
  const [searchParams] = useSearchParams();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [connectSyncing, setConnectSyncing] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState("");

  const fmt = (n: number) => formatCurrency(n, activeCountry);

  const EXPENSE_CATEGORIES: Record<string, string> = {
    travaux: t("page.finances.cat_travaux"), assurance: t("page.finances.cat_assurance"), taxe_fonciere: t("page.finances.cat_taxe_fonciere"),
    charges_copro: t("page.finances.cat_charges_copro"), interet_emprunt: t("page.finances.cat_interet"),
    frais_gestion: t("page.finances.cat_gestion"), diagnostics: t("page.finances.cat_diagnostics"), honoraires: t("page.finances.cat_honoraires"), other: t("page.finances.cat_other"),
  };

  const checkConnectStatus = async (silent = false) => {
    if (silent) setConnectSyncing(true);
    else setConnectLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("check-connect-status");
      if (error) throw error;
      setConnectStatus(data);
    } catch {
      setConnectStatus({ connected: false, onboarding_complete: false });
    } finally {
      if (silent) setConnectSyncing(false);
      else setConnectLoading(false);
    }
  };

  const fetchData = async () => {
    if (!orgId) return;
    try {
      let propsQuery = supabase.from("properties").select("id, label, country").eq("org_id", orgId).order("label");
      if (countryFilter) propsQuery = propsQuery.eq("country", countryFilter);
      const { data: props } = await propsQuery;
      const filteredProps = props || [];
      setProperties(filteredProps.map(p => ({ id: p.id, label: p.label })));

      const propIds = filteredProps.map(p => p.id);
      if (propIds.length > 0) {
        const [{ data: rc }, { data: exp }] = await Promise.all([
          supabase.from("rent_calls").select("id, month, rent_amount, charges_amount, total_amount, paid, paid_date, tenant_id, property_id, payment_status, payment_method").eq("org_id", orgId).in("property_id", propIds).order("month", { ascending: true }),
          supabase.from("expenses").select("id, label, amount, category, expense_date, property_id").eq("org_id", orgId).in("property_id", propIds).order("expense_date", { ascending: false }),
        ]);
        setRentCalls(rc || []);
        setExpenses(exp || []);
      } else if (!countryFilter) {
        const [{ data: rc }, { data: exp }] = await Promise.all([
          supabase.from("rent_calls").select("id, month, rent_amount, charges_amount, total_amount, paid, paid_date, tenant_id, property_id, payment_status, payment_method").eq("org_id", orgId).order("month", { ascending: true }),
          supabase.from("expenses").select("id, label, amount, category, expense_date, property_id").eq("org_id", orgId).order("expense_date", { ascending: false }),
        ]);
        setRentCalls(rc || []);
        setExpenses(exp || []);
      } else {
        setRentCalls([]);
        setExpenses([]);
      }
    } catch {
      setRentCalls([]);
      setExpenses([]);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { if (user) checkConnectStatus(); }, [user]);
  useEffect(() => { if (orgId) fetchData(); }, [orgId]);

  useEffect(() => {
    if (searchParams.get("connect") === "success") {
      toast({ title: t("page.finances.stripe_connected"), description: t("page.finances.checking") });
      checkConnectStatus();
    }
  }, [searchParams]);

  const handleConnectOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!confirm(t("page.finances.disconnect_confirm"))) return;
    setDisconnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("disconnect-stripe");
      if (error) throw error;
      toast({ title: t("page.finances.disconnect_success") });
      setConnectStatus({ connected: false, onboarding_complete: false });
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setDisconnectLoading(false);
    }
  };

  // Filter by property
  const filteredRentCalls = propertyFilter ? rentCalls.filter(r => r.property_id === propertyFilter) : rentCalls;
  const filteredExpenses = propertyFilter ? expenses.filter(e => e.property_id === propertyFilter) : expenses;

  // KPIs
  const kpis = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const currentMonthCalls = filteredRentCalls.filter(r => r.month === currentMonth);
    const allPaid = filteredRentCalls.filter(r => r.paid);
    const allUnpaid = filteredRentCalls.filter(r => !r.paid);

    const revenueThisMonth = currentMonthCalls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
    const expectedThisMonth = currentMonthCalls.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalRevenue = allPaid.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalExpected = filteredRentCalls.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalUnpaid = allUnpaid.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const netResult = totalRevenue - totalExpenses;
    const occupancyRate = currentMonthCalls.length > 0
      ? Math.round((currentMonthCalls.filter(r => r.paid).length / currentMonthCalls.length) * 100)
      : 0;

    return { revenueThisMonth, expectedThisMonth, totalRevenue, totalExpected, totalUnpaid, totalExpenses, netResult, occupancyRate };
  }, [filteredRentCalls, filteredExpenses]);

  // Monthly bar chart data (last 12 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; label: string; collected: number; unpaid: number; expenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy", { locale: dateFnsLocale });
      const calls = filteredRentCalls.filter(r => r.month === key);
      const paid = calls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
      const unpaidAmt = calls.filter(r => !r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
      const exp = filteredExpenses.filter(e => e.expense_date.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0);
      months.push({ month: key, label, collected: paid, unpaid: unpaidAmt, expenses: exp });
    }
    return months;
  }, [filteredRentCalls, filteredExpenses, dateFnsLocale]);

  // Pie chart
  const pieData = useMemo(() => {
    const paid = filteredRentCalls.filter(r => r.paid).length;
    const unpaid = filteredRentCalls.filter(r => !r.paid).length;
    return [
      { name: t("page.common.paid"), value: paid },
      { name: t("page.common.unpaid"), value: unpaid },
    ].filter(d => d.value > 0);
  }, [filteredRentCalls, t]);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map).map(([cat, amount]) => ({
      name: EXPENSE_CATEGORIES[cat] || cat,
      value: amount,
    })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const chartConfig = {
    collected: { label: t("page.dashboard.collected"), color: "hsl(var(--accent))" },
    unpaid: { label: t("page.common.unpaid"), color: "hsl(var(--destructive))" },
    expenses: { label: t("page.finances.total_expenses"), color: "hsl(var(--muted-foreground))" },
  };

  const propName = (id: string | null) => properties.find(p => p.id === id)?.label || "—";

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel={t("page.finances.title")}>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-accent/10 shrink-0"><Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /></div>
              {t("page.finances.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("page.finances.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
              className="form-select w-auto text-sm max-w-[180px]">
              <option value="">{t("page.finances.all_properties")}</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {rentCalls.length > 0 && (
              <button
                onClick={() => exportToCSV(
                  filteredRentCalls.map(r => ({
                    month: r.month,
                    rent: r.rent_amount,
                    charges: r.charges_amount,
                    total: r.total_amount,
                    paid: r.paid ? t("page.common.paid") : t("page.common.unpaid"),
                    paid_date: r.paid_date || "",
                  })),
                  "finances_rent",
                  [
                    { key: "month", label: "Month" },
                    { key: "rent", label: "Rent" },
                    { key: "charges", label: "Charges" },
                    { key: "total", label: "Total" },
                    { key: "paid", label: t("page.common.paid") },
                    { key: "paid_date", label: "Date" },
                  ]
                )}
                className="btn-secondary btn-sm"
              >
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">{t("page.common.export_csv")}</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Stripe Connect Card */}
        <div className={`ui-card stripe-connect-card ${
          connectStatus?.onboarding_complete 
            ? "border-success/30" 
            : "border-accent/30"
        }`}>
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className={`p-3 rounded-lg ${connectStatus?.onboarding_complete ? "bg-success/10" : "bg-accent/10"}`}>
              <CreditCard className={`h-6 w-6 ${connectStatus?.onboarding_complete ? "text-success" : "text-accent"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="font-semibold text-foreground text-lg">{t("page.finances.online_payment")}</h2>
                <button
                  onClick={() => checkConnectStatus(true)}
                  disabled={connectSyncing || connectLoading}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {connectSyncing ? t("page.finances.checking") : "Sync Stripe"}
                </button>
              </div>
              {connectLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("page.finances.checking")}
                </div>
              ) : connectStatus?.onboarding_complete ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-success text-sm font-medium">
                    <CheckCircle className="h-4 w-4" /> {t("page.finances.stripe_connected")}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {connectStatus.charges_enabled && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> {t("page.finances.payments_enabled")}</span>}
                    {connectStatus.payouts_enabled && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> {t("page.finances.payouts_enabled")}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={handleConnectOnboarding} disabled={onboardingLoading} className="text-sm text-accent hover:underline flex items-center gap-1">
                      {onboardingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                      {t("page.finances.edit_bank")}
                    </button>
                    <button onClick={handleDisconnectStripe} disabled={disconnectLoading} className="text-sm text-destructive hover:underline flex items-center gap-1">
                      {disconnectLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {t("page.finances.disconnect_stripe")}
                    </button>
                  </div>
                </div>
              ) : connectStatus?.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <AlertTriangle className="h-4 w-4" /> {t("page.finances.onboarding_pending")}
                  </div>
                  <button onClick={handleConnectOnboarding} disabled={onboardingLoading} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
                    {onboardingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    {t("page.finances.continue_activation")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t("page.finances.connect_desc")}
                  </p>
                  <button onClick={handleConnectOnboarding} disabled={onboardingLoading} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
                    {onboardingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {t("page.finances.connect_stripe")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {[
            { icon: TrendingUp, label: t("page.finances.collected_month"), value: dataLoading ? "..." : fmt(kpis.revenueThisMonth), sub: `${t("page.finances.on")} ${fmt(kpis.expectedThisMonth)}`, path: "/dashboard/rental?tab=payments", iconClassName: "text-success" },
            { icon: TrendingDown, label: t("page.finances.unpaid"), value: dataLoading ? "..." : fmt(kpis.totalUnpaid), sub: `${filteredRentCalls.filter(r => !r.paid).length} ${t("page.finances.call_count")}`, path: "/dashboard/dunning", iconClassName: "text-destructive" },
            { icon: PiggyBank, label: t("page.finances.total_collected"), value: dataLoading ? "..." : fmt(kpis.totalRevenue), sub: `${t("page.finances.on")} ${fmt(kpis.totalExpected)}`, path: "/dashboard/rental?tab=payments", iconClassName: "text-accent" },
            { icon: Wallet, label: t("page.finances.total_expenses"), value: dataLoading ? "..." : fmt(kpis.totalExpenses), sub: `${filteredExpenses.length} ${t("page.finances.expense_count")}`, path: "/dashboard/expenses", iconClassName: "text-destructive" },
            { icon: BarChart3, label: t("page.finances.net_result"), value: dataLoading ? "..." : fmt(kpis.netResult), sub: `${t("page.finances.total_collected")} - ${t("page.finances.total_expenses")}`, iconClassName: "text-accent", valueClassName: kpis.netResult >= 0 ? "text-success" : "text-destructive" },
            { icon: CheckCircle, label: t("page.finances.collection_rate"), value: dataLoading ? "..." : `${kpis.occupancyRate}%`, path: "/dashboard/rental?tab=payments", iconClassName: "text-accent" },
          ].map(kpi => (
            <StatCard key={kpi.label} {...kpi} />
          ))}
        </motion.div>

        {/* Charts */}
        <Tabs defaultValue="bar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bar">{t("page.finances.revenue_expenses")}</TabsTrigger>
            <TabsTrigger value="pie">{t("page.finances.payments")}</TabsTrigger>
            <TabsTrigger value="expenses">{t("page.finances.expenses_category")}</TabsTrigger>
            <TabsTrigger value="detail">{t("page.finances.detail_expenses")}</TabsTrigger>
          </TabsList>

          <TabsContent value="bar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("page.finances.chart_title")}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredRentCalls.length === 0 && filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">{t("page.finances.no_data")}</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `${v}€`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="unpaid" fill="var(--color-unpaid)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pie">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("page.finances.payments")}</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">{t("page.finances.no_data")}</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("page.finances.expenses_category")}</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesByCategory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">{t("page.finances.no_data")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expensesByCategory.map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-foreground flex-1">{cat.name}</span>
                        <span className="text-sm font-semibold text-foreground">{fmt(cat.value)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Total</span>
                      <span className="text-sm font-bold text-foreground">{fmt(kpis.totalExpenses)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detail">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("page.finances.detail_expenses")}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">{t("page.finances.no_data")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredExpenses.slice(0, 20).map(e => (
                      <div key={e.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-foreground">{e.label}</p>
                          <p className="text-xs text-muted-foreground">{e.expense_date} · {EXPENSE_CATEGORIES[e.category] || e.category} · {propName(e.property_id)}</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{fmt(Number(e.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Finances;
