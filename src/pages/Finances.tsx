import { useState, useEffect, useMemo } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, CreditCard, CheckCircle, Loader2, ExternalLink, AlertTriangle, Link2, BarChart3, Download, Home, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { exportToCSV } from "@/lib/csv-export";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

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

const EXPENSE_CATEGORIES: Record<string, string> = {
  travaux: "Travaux", assurance: "Assurance", taxe_fonciere: "Taxe foncière",
  charges_copro: "Charges copro", interet_emprunt: "Intérêts emprunt",
  frais_gestion: "Frais gestion", diagnostics: "Diagnostics", honoraires: "Honoraires", other: "Autre",
};

const COLORS = ["hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const Finances = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [connectSyncing, setConnectSyncing] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState("");

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
      const [{ data: rc }, { data: exp }, { data: props }] = await Promise.all([
        supabase.from("rent_calls").select("id, month, rent_amount, charges_amount, total_amount, paid, paid_date, tenant_id, property_id").eq("org_id", orgId).order("month", { ascending: true }),
        supabase.from("expenses").select("id, label, amount, category, expense_date, property_id").eq("org_id", orgId).order("expense_date", { ascending: false }),
        supabase.from("properties").select("id, label").eq("org_id", orgId).order("label"),
      ]);
      setRentCalls(rc || []);
      setExpenses(exp || []);
      setProperties(props || []);
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
      toast({ title: "Compte Stripe connecté !", description: "Vérification du statut en cours..." });
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
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setOnboardingLoading(false);
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
    const months: { month: string; label: string; encaissé: number; impayé: number; dépenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy", { locale: fr });
      const calls = filteredRentCalls.filter(r => r.month === key);
      const paid = calls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
      const unpaid = calls.filter(r => !r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
      const exp = filteredExpenses.filter(e => e.expense_date.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0);
      months.push({ month: key, label, encaissé: paid, impayé: unpaid, dépenses: exp });
    }
    return months;
  }, [filteredRentCalls, filteredExpenses]);

  // Pie chart
  const pieData = useMemo(() => {
    const paid = filteredRentCalls.filter(r => r.paid).length;
    const unpaid = filteredRentCalls.filter(r => !r.paid).length;
    return [
      { name: "Payés", value: paid },
      { name: "Impayés", value: unpaid },
    ].filter(d => d.value > 0);
  }, [filteredRentCalls]);

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
    encaissé: { label: "Encaissé", color: "hsl(var(--accent))" },
    impayé: { label: "Impayé", color: "hsl(var(--destructive))" },
    dépenses: { label: "Dépenses", color: "hsl(var(--muted-foreground))" },
  };

  const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const propName = (id: string | null) => properties.find(p => p.id === id)?.label || "—";

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel="Finances">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Finances</h1>
            <p className="text-muted-foreground mt-1">Revenus locatifs, dépenses et résultat net</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Property filter */}
            <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Tous les biens</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {rentCalls.length > 0 && (
              <button
                onClick={() => exportToCSV(
                  filteredRentCalls.map(r => ({
                    mois: r.month,
                    loyer: r.rent_amount,
                    charges: r.charges_amount,
                    total: r.total_amount,
                    payé: r.paid ? "Oui" : "Non",
                    date_paiement: r.paid_date || "",
                  })),
                  "finances_loyers",
                  [
                    { key: "mois", label: "Mois" },
                    { key: "loyer", label: "Loyer (€)" },
                    { key: "charges", label: "Charges (€)" },
                    { key: "total", label: "Total (€)" },
                    { key: "payé", label: "Payé" },
                    { key: "date_paiement", label: "Date de paiement" },
                  ]
                )}
                className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Stripe Connect Card */}
        <div className={`rounded-xl p-6 border shadow-card ${
          connectStatus?.onboarding_complete 
            ? "bg-card border-green-500/30" 
            : "bg-card border-accent/30"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${connectStatus?.onboarding_complete ? "bg-green-500/10" : "bg-accent/10"}`}>
              <CreditCard className={`h-6 w-6 ${connectStatus?.onboarding_complete ? "text-green-500" : "text-accent"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="font-semibold text-foreground text-lg">Paiement en ligne des loyers</h2>
                <button
                  onClick={() => checkConnectStatus(true)}
                  disabled={connectSyncing || connectLoading}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {connectSyncing ? "Synchronisation..." : "Synchroniser Stripe"}
                </button>
              </div>
              {connectLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Vérification...
                </div>
              ) : connectStatus?.onboarding_complete ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" /> Compte Stripe connecté — vos locataires peuvent payer par CB et Apple Pay
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {connectStatus.charges_enabled && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Paiements activés</span>}
                    {connectStatus.payouts_enabled && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Virements activés</span>}
                  </div>
                  <button onClick={handleConnectOnboarding} disabled={onboardingLoading} className="text-sm text-accent hover:underline flex items-center gap-1 mt-2">
                    {onboardingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                    Modifier mes informations bancaires
                  </button>
                </div>
              ) : connectStatus?.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-600 text-sm">
                    <AlertTriangle className="h-4 w-4" /> Onboarding en cours — complétez la vérification
                  </div>
                  <button onClick={handleConnectOnboarding} disabled={onboardingLoading} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
                    {onboardingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Continuer l'activation
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connectez votre compte bancaire pour recevoir les paiements de loyer directement par carte bancaire ou Apple Pay.
                  </p>
                  <button onClick={handleConnectOnboarding} disabled={onboardingLoading} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
                    {onboardingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Connecter mon compte Stripe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: TrendingUp, label: "Encaissé ce mois", value: dataLoading ? "..." : fmt(kpis.revenueThisMonth), sub: `sur ${fmt(kpis.expectedThisMonth)} attendu`, path: "/dashboard/rental?tab=payments", iconColor: "text-green-500" },
            { icon: TrendingDown, label: "Impayés", value: dataLoading ? "..." : fmt(kpis.totalUnpaid), sub: `${filteredRentCalls.filter(r => !r.paid).length} appel(s)`, path: "/dashboard/dunning", iconColor: "text-destructive" },
            { icon: PiggyBank, label: "Total encaissé", value: dataLoading ? "..." : fmt(kpis.totalRevenue), sub: `sur ${fmt(kpis.totalExpected)} attendu`, path: "/dashboard/rental?tab=payments", iconColor: "text-accent" },
            { icon: Wallet, label: "Total dépenses", value: dataLoading ? "..." : fmt(kpis.totalExpenses), sub: `${filteredExpenses.length} dépense(s)`, path: "/dashboard/expenses", iconColor: "text-destructive" },
            { icon: BarChart3, label: "Résultat net", value: dataLoading ? "..." : fmt(kpis.netResult), sub: `Encaissé - Dépenses`, path: "", iconColor: "text-accent", valueColor: kpis.netResult >= 0 ? "text-green-600" : "text-destructive" },
            { icon: CheckCircle, label: "Taux encaissement", value: dataLoading ? "..." : `${kpis.occupancyRate}%`, sub: "ce mois", path: "/dashboard/rental?tab=payments", iconColor: "text-accent" },
          ].map(kpi => {
            const content = (
              <Card className={`${kpi.path ? "hover:shadow-card-hover transition-all cursor-pointer" : ""} group`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                    <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                    {kpi.path && <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors ml-auto" />}
                  </div>
                  <p className={`text-lg font-bold ${(kpi as any).valueColor || "text-foreground"}`}>{kpi.value}</p>
                  {kpi.sub && <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>}
                </CardContent>
              </Card>
            );
            return kpi.path ? (
              <Link key={kpi.label} to={kpi.path}>{content}</Link>
            ) : (
              <div key={kpi.label}>{content}</div>
            );
          })}
        </div>

        {/* Charts */}
        <Tabs defaultValue="bar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bar">Revenus & Dépenses</TabsTrigger>
            <TabsTrigger value="pie">Paiements</TabsTrigger>
            <TabsTrigger value="expenses">Dépenses par catégorie</TabsTrigger>
            <TabsTrigger value="detail">Détail dépenses</TabsTrigger>
          </TabsList>

          <TabsContent value="bar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenus vs Dépenses — 12 derniers mois</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredRentCalls.length === 0 && filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Aucune donnée — les graphiques apparaîtront automatiquement.</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `${v}€`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="encaissé" fill="var(--color-encaissé)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="impayé" fill="var(--color-impayé)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="dépenses" fill="var(--color-dépenses)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pie">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition payés / impayés</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Aucune donnée disponible.</p>
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
                <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesByCategory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Aucune dépense enregistrée.</p>
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
                <CardTitle className="text-base">Dernières dépenses</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Aucune dépense enregistrée.</p>
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
