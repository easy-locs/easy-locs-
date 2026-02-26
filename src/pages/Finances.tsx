import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, CreditCard, CheckCircle, Loader2, ExternalLink, AlertTriangle, Link2, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
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
}

const COLORS = ["hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const Finances = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const checkConnectStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-connect-status");
      if (error) throw error;
      setConnectStatus(data);
    } catch {
      setConnectStatus({ connected: false, onboarding_complete: false });
    } finally {
      setConnectLoading(false);
    }
  };

  const fetchRentCalls = async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from("rent_calls")
        .select("id, month, rent_amount, charges_amount, total_amount, paid, paid_date, tenant_id")
        .eq("org_id", orgId)
        .order("month", { ascending: true });
      if (error) throw error;
      setRentCalls(data || []);
    } catch {
      setRentCalls([]);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) checkConnectStatus();
  }, [user]);

  useEffect(() => {
    if (orgId) fetchRentCalls();
  }, [orgId]);

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

  // KPIs
  const kpis = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const currentMonthCalls = rentCalls.filter(r => r.month === currentMonth);
    const allPaid = rentCalls.filter(r => r.paid);
    const allUnpaid = rentCalls.filter(r => !r.paid);

    const revenueThisMonth = currentMonthCalls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
    const expectedThisMonth = currentMonthCalls.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalRevenue = allPaid.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalUnpaid = allUnpaid.reduce((s, r) => s + Number(r.total_amount), 0);
    const occupancyRate = currentMonthCalls.length > 0
      ? Math.round((currentMonthCalls.filter(r => r.paid).length / currentMonthCalls.length) * 100)
      : 0;

    return { revenueThisMonth, expectedThisMonth, totalRevenue, totalUnpaid, occupancyRate };
  }, [rentCalls]);

  // Monthly bar chart data (last 12 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; label: string; encaissé: number; impayé: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy", { locale: fr });
      const calls = rentCalls.filter(r => r.month === key);
      const paid = calls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
      const unpaid = calls.filter(r => !r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
      months.push({ month: key, label, encaissé: paid, impayé: unpaid });
    }
    return months;
  }, [rentCalls]);

  // Pie chart
  const pieData = useMemo(() => {
    const paid = rentCalls.filter(r => r.paid).length;
    const unpaid = rentCalls.filter(r => !r.paid).length;
    return [
      { name: "Payés", value: paid },
      { name: "Impayés", value: unpaid },
    ].filter(d => d.value > 0);
  }, [rentCalls]);

  const chartConfig = {
    encaissé: { label: "Encaissé", color: "hsl(var(--accent))" },
    impayé: { label: "Impayé", color: "hsl(var(--destructive))" },
  };

  const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finances</h1>
          <p className="text-muted-foreground mt-1">Suivi des revenus locatifs, charges et paiements en ligne</p>
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
              <h2 className="font-semibold text-foreground text-lg mb-1">Paiement en ligne des loyers</h2>
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
                    <AlertTriangle className="h-4 w-4" /> Onboarding en cours — complétez la vérification pour recevoir les paiements
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-xs text-muted-foreground">Encaissé ce mois</span>
              </div>
              <p className="text-xl font-bold text-foreground">{dataLoading ? "..." : fmt(kpis.revenueThisMonth)}</p>
              <p className="text-xs text-muted-foreground mt-1">sur {fmt(kpis.expectedThisMonth)} attendu</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <span className="text-xs text-muted-foreground">Total impayés</span>
              </div>
              <p className="text-xl font-bold text-foreground">{dataLoading ? "..." : fmt(kpis.totalUnpaid)}</p>
              <p className="text-xs text-muted-foreground mt-1">{rentCalls.filter(r => !r.paid).length} appel(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <PiggyBank className="h-5 w-5 text-accent" />
                <span className="text-xs text-muted-foreground">Total encaissé</span>
              </div>
              <p className="text-xl font-bold text-foreground">{dataLoading ? "..." : fmt(kpis.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                <span className="text-xs text-muted-foreground">Taux d'encaissement</span>
              </div>
              <p className="text-xl font-bold text-foreground">{dataLoading ? "..." : `${kpis.occupancyRate}%`}</p>
              <p className="text-xs text-muted-foreground mt-1">ce mois-ci</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="bar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bar">Revenus mensuels</TabsTrigger>
            <TabsTrigger value="pie">Répartition</TabsTrigger>
          </TabsList>

          <TabsContent value="bar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenus des 12 derniers mois</CardTitle>
              </CardHeader>
              <CardContent>
                {rentCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Aucun appel de loyer — les graphiques apparaîtront automatiquement.</p>
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Finances;
