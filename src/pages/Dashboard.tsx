import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText, Home, Bell, FolderLock, BrainCircuit, ArrowRight,
  AlertTriangle, TrendingUp, Clock, Users, Euro, Building,
  Download, PiggyBank, Percent,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import { fr, enUS, es, de, it, pt, type Locale as DateFnsLocale } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/country-config";
import WorldPropertyMap from "@/components/dashboard/WorldPropertyMap";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";

const DATE_LOCALES: Record<string, DateFnsLocale> = { fr, en: enUS, es, de, it, pt };

const Dashboard = () => {
  const { orgId, userCountry } = useAuth();
  const { t, locale } = useI18n();
  const dateFnsLocale = DATE_LOCALES[locale] || fr;
  const fmt = (n: number) => formatCurrency(n, userCountry);

  const quickActions = [
    { icon: Euro, label: t("page.dashboard.generate_receipt"), path: "/dashboard/rental?tab=payments", color: "bg-info/10 text-info" },
    { icon: Users, label: t("page.rental.add_tenant"), path: "/dashboard/rental?tab=tenants", color: "bg-success/10 text-success" },
    { icon: Bell, label: t("page.dashboard.view_reminders"), path: "/dashboard/reminders", color: "bg-warning/10 text-warning" },
    { icon: FolderLock, label: t("page.dashboard.my_vault"), path: "/dashboard/vault", color: "bg-accent/10 text-gold-dark" },
  ];

  const [stats, setStats] = useState({
    properties: 0, tenants: 0, documents: 0,
    rentCalls: [] as { month: string; paid: boolean; total_amount: number }[],
    reminders: 0, vaultFiles: 0, vaultSize: 0,
    tenantsList: [] as { property_id: string | null; lease_end: string | null }[],
    expenses: [] as { amount: number; expense_date: string }[],
    reservations: [] as { amount: number; check_in: string }[],
    propertiesByCountry: [] as { code: string; count: number; flag: string; name: string }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("properties").select("id, country", { count: "exact" }).eq("org_id", orgId),
      supabase.from("tenants").select("id, property_id, lease_end").eq("org_id", orgId),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("rent_calls").select("month, paid, total_amount").eq("org_id", orgId),
      supabase.from("reminders").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("active", true),
      supabase.from("vault_files").select("size").eq("org_id", orgId),
      supabase.from("expenses").select("amount, expense_date").eq("org_id", orgId),
      supabase.from("reservations").select("amount, check_in").eq("org_id", orgId),
    ]).then(([props, tenantsRes, docs, rc, rem, vault, expRes, resRes]) => {
      const vaultFiles = vault.data || [];
      const tenantsList = (tenantsRes.data || []) as any[];
      const propData = (props.data || []) as { id: string; country: string }[];

      // Aggregate properties by country
      const countryMap = new Map<string, number>();
      propData.forEach(p => {
        const c = p.country || "FR";
        countryMap.set(c, (countryMap.get(c) || 0) + 1);
      });
      const propertiesByCountry = Array.from(countryMap.entries())
        .map(([code, count]) => {
          const entry = getCountryEntryOrDefault(code);
          return { code, count, flag: entry.flag, name: entry.name };
        })
        .sort((a, b) => b.count - a.count);

      setStats({
        properties: props.count || propData.length,
        tenants: tenantsList.length,
        documents: docs.count || 0,
        rentCalls: (rc.data || []) as any,
        reminders: rem.count || 0,
        vaultFiles: vaultFiles.length,
        vaultSize: vaultFiles.reduce((s, f) => s + (Number(f.size) || 0), 0),
        tenantsList,
        expenses: (expRes.data || []) as any,
        reservations: (resRes.data || []) as any,
        propertiesByCountry,
      });
      setLoading(false);
    });
  }, [orgId]);

  const kpis = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const monthCalls = stats.rentCalls.filter(r => r.month === currentMonth);
    const revenueThisMonth = monthCalls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
    const unpaidTotal = stats.rentCalls.filter(r => !r.paid).reduce((s, r) => s + Number(r.total_amount), 0);

    const today = new Date().toISOString().split("T")[0];
    const occupiedProperties = new Set(
      stats.tenantsList.filter(t => t.property_id && (!t.lease_end || t.lease_end >= today)).map(t => t.property_id)
    ).size;
    const occupancyRate = stats.properties > 0 ? Math.round((occupiedProperties / stats.properties) * 100) : 0;
    const vacantCount = stats.properties - occupiedProperties;

    const expensesThisMonth = stats.expenses
      .filter(e => e.expense_date?.startsWith(currentMonth))
      .reduce((s, e) => s + Number(e.amount), 0);
    const seasonalThisMonth = stats.reservations
      .filter(r => r.check_in?.startsWith(currentMonth))
      .reduce((s, r) => s + Number(r.amount), 0);
    const netIncome = revenueThisMonth + seasonalThisMonth - expensesThisMonth;

    return { revenueThisMonth, unpaidTotal, occupancyRate, vacantCount, netIncome, expensesThisMonth };
  }, [stats]);

  const revenueChart = useMemo(() => {
    const now = new Date();
    const months: { month: string; label: string; paid: number; unpaid: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM", { locale: dateFnsLocale });
      const monthCalls = stats.rentCalls.filter(r => r.month === key);
      months.push({
        month: key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        paid: monthCalls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0),
        unpaid: monthCalls.filter(r => !r.paid).reduce((s, r) => s + Number(r.total_amount), 0),
      });
    }
    return months;
  }, [stats.rentCalls, dateFnsLocale]);

  const fmtSize = (bytes: number) => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

  const upcomingActions = useMemo(() => {
    const actions: { label: string; date: string; urgent: boolean; path: string }[] = [];
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const unpaidThisMonth = stats.rentCalls.filter(r => r.month === currentMonth && !r.paid).length;
    if (unpaidThisMonth > 0) {
      actions.push({ label: `${unpaidThisMonth} ${t("page.dashboard.unpaid_rents")}`, date: format(now, "MMMM yyyy", { locale: dateFnsLocale }), urgent: true, path: "/dashboard/dunning" });
    }
    if (kpis.vacantCount > 0) {
      actions.push({ label: `${kpis.vacantCount} ${t("page.dashboard.vacant_props")}`, date: t("page.dashboard.to_fill"), urgent: kpis.vacantCount > 1, path: "/dashboard/rental" });
    }
    if (stats.reminders > 0) {
      actions.push({ label: `${stats.reminders} ${t("page.dashboard.active_reminders")}`, date: t("page.dashboard.to_process"), urgent: false, path: "/dashboard/reminders" });
    }
    if (actions.length === 0) {
      actions.push({ label: t("page.dashboard.all_good"), date: "", urgent: false, path: "" });
    }
    return actions;
  }, [stats, kpis, t, dateFnsLocale]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">{t("page.dashboard.hello")}</h1>
          <p className="text-muted-foreground mb-8">{t("page.dashboard.summary")}</p>
        </motion.div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Building, label: t("page.dashboard.properties"), value: loading ? "..." : String(stats.properties), sub: `${stats.tenants} ${t("page.dashboard.tenants_count")}`, path: "/dashboard/rental?tab=properties" },
            { icon: Euro, label: t("page.dashboard.collected_month"), value: loading ? "..." : fmt(kpis.revenueThisMonth), sub: kpis.unpaidTotal > 0 ? `${fmt(kpis.unpaidTotal)} ${t("page.dashboard.unpaid_amount")}` : t("page.dashboard.no_unpaid"), path: "/dashboard/rental?tab=payments" },
            { icon: Percent, label: t("page.dashboard.occupancy"), value: loading ? "..." : `${kpis.occupancyRate}%`, sub: `${kpis.vacantCount} ${t("page.dashboard.vacant")}`, path: "/dashboard/rental?tab=properties" },
            { icon: PiggyBank, label: t("page.dashboard.net_income") || "Résultat net", value: loading ? "..." : fmt(kpis.netIncome), sub: `${fmt(kpis.expensesThisMonth)} ${t("page.dashboard.expenses_label") || "dépenses"}`, path: "/dashboard/finances" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="h-full"
            >
              <Link
                to={stat.path}
                className="flex flex-col h-full bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all group"
              >
                {/* Icon + Arrow row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors shrink-0">
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
                </div>
                {/* Title — fixed single line */}
                <span className="text-xs sm:text-sm text-muted-foreground truncate mb-1">{stat.label}</span>
                {/* Value — prominent */}
                <div className="text-xl sm:text-2xl font-bold text-foreground mt-auto">{stat.value}</div>
                {/* Secondary info */}
                <div className="text-[11px] sm:text-xs text-muted-foreground truncate mt-1">{stat.sub}</div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* World Map */}
        {!loading && stats.propertiesByCountry.length > 0 && (
          <WorldPropertyMap propertiesByCountry={stats.propertiesByCountry} userCountry={userCountry} />
        )}

        {/* Revenue chart */}
        {!loading && revenueChart.some(m => m.paid > 0 || m.unpaid > 0) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />{t("page.dashboard.revenue_trend")}
            </h2>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueChart} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                    formatter={(value: number, name: string) => [fmt(value), name === "paid" ? t("page.dashboard.collected") : t("page.dashboard.unpaid_label")]}
                  />
                  <Bar dataKey="paid" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="paid" />
                  <Bar dataKey="unpaid" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="unpaid" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t("page.dashboard.quick_actions")}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="group flex flex-col items-center text-center gap-3 bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all h-full"
              >
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${action.color}`}>
                  <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* AI Assistant CTA */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
          <Link
            to="/dashboard/assistant"
            className="flex items-center gap-4 bg-hero rounded-xl p-6 text-primary-foreground hover:opacity-95 transition-opacity"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
              <BrainCircuit className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{t("page.dashboard.ai_question")}</h3>
              <p className="text-sm text-primary-foreground/60">{t("page.dashboard.ai_desc")}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary-foreground/60" />
          </Link>
        </motion.div>

        {/* Alerts & actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">{t("page.dashboard.alerts")}</h2>
          <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
            {upcomingActions.map((r, i) => {
              const Wrapper = r.path ? Link : "div" as any;
              const wrapperProps = r.path ? { to: r.path } : {};
              return (
                <Wrapper key={i} {...wrapperProps} className={`flex items-center gap-4 p-4 ${r.path ? "hover:bg-muted/50 cursor-pointer transition-colors" : ""}`}>
                  {r.urgent ? (
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                  ) : (
                    <Bell className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{r.label}</div>
                    {r.date && <div className="text-xs text-muted-foreground">{r.date}</div>}
                  </div>
                  {r.path && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </Wrapper>
              );
            })}
          </div>
        </motion.div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
