import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Globe, Building, Users, MapPin, Plus, TrendingUp, Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import OrbitSmartHub from "@/components/dashboard/OrbitSmartHub";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import { useWallet } from "@/hooks/useWallet";

const OnboardingChecklist = lazy(() => import("@/components/onboarding/OnboardingChecklist"));
const WelcomeTour = lazy(() => import("@/components/onboarding/WelcomeTour"));
const SuperAppHome = lazy(() => import("@/components/storefront/SuperAppHome"));

type CountryStat = {
  code: string;
  count: number;
  flag: string;
  name: string;
  tenants: number;
};


const Dashboard = () => {
  const { orgId } = useAuth();
  const { t } = useI18n();
  const { fmtLocal, fmtCurrency, code: userCurrencyCode } = usePlatformCurrency();
  const { balance } = useWallet();
  const fmt = (n: number) => fmtLocal(n);

  const [stats, setStats] = useState({
    totalProperties: 0,
    totalCountries: 0,
    revenueThisMonth: 0,
    propertiesByCountry: [] as CountryStat[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      // No org = free/client account, show empty state immediately
      setLoading(false);
      return;
    }

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => setLoading(false), 8000);

    Promise.all([
      supabase.from("properties").select("id, country").eq("org_id", orgId),
      supabase.from("tenants").select("id, property_id, lease_end").eq("org_id", orgId),
      supabase.from("rent_calls").select("month, paid, total_amount").eq("org_id", orgId),
    ])
      .then(([props, tenantsRes, rc]) => {
        clearTimeout(timeout);
        const propData = (props.data || []) as { id: string; country: string }[];
        const tenantsList = (tenantsRes.data || []) as { id: string; property_id: string | null; lease_end: string | null }[];

        const countryMap = new Map<string, { count: number; propIds: Set<string> }>();
        propData.forEach((p) => {
          const c = p.country || "FR";
          const existing = countryMap.get(c) || { count: 0, propIds: new Set<string>() };
          existing.count++;
          existing.propIds.add(p.id);
          countryMap.set(c, existing);
        });

        const today = new Date().toISOString().split("T")[0];
        const propertiesByCountry = Array.from(countryMap.entries())
          .map(([code, data]) => {
            const entry = getCountryEntryOrDefault(code);
            const countryTenants = tenantsList.filter(
              (tenant) => tenant.property_id && data.propIds.has(tenant.property_id) && (!tenant.lease_end || tenant.lease_end >= today)
            );
            return {
              code,
              count: data.count,
              flag: entry.flag,
              name: entry.name,
              tenants: countryTenants.length,
            };
          })
          .sort((a, b) => b.count - a.count);

        const currentMonth = format(new Date(), "yyyy-MM");
        const monthCalls = ((rc.data || []) as Array<{ month: string; paid: boolean; total_amount: number | string }>).filter(
          (r) => r.month === currentMonth
        );
        const revenueThisMonth = monthCalls
          .filter((r) => r.paid)
          .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

        setStats({
          totalProperties: propData.length,
          totalCountries: countryMap.size,
          revenueThisMonth,
          propertiesByCountry,
        });
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error("[Dashboard] data fetch error:", err);
        setError(t("error.load_failed") || "Failed to load dashboard data");
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, [orgId]);

  const kpis = [
    {
      icon: Building,
      label: t("page.dashboard.properties") || "Properties",
      value: String(stats.totalProperties),
      path: "/dashboard/properties",
      sub: t("page.dashboard.view_all") || "View all properties →",
    },
    {
      icon: MapPin,
      label: t("page.dashboard.countries") || "Active Countries",
      value: String(stats.totalCountries),
      sub: t("page.dashboard.select_country_hint") || "Select below",
    },
    {
      icon: TrendingUp,
      label: t("page.dashboard.collected_month") || "Collected This Month",
      value: fmt(stats.revenueThisMonth),
      path: "/dashboard/receipts",
      sub: t("page.dashboard.view_receipts") || "View receipts →",
    },
    {
      icon: Wallet,
      label: `Wallet (${userCurrencyCode})`,
      value: fmtLocal(balance?.balance || 0),
      path: "/dashboard/wallet",
      sub: t("page.dashboard.view_wallet") || "Open wallet →",
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Welcome Tour for first-time users */}
        <Suspense fallback={null}><WelcomeTour /></Suspense>

        {/* Onboarding Checklist */}
        <Suspense fallback={null}>
          <div className="mb-6">
            <OnboardingChecklist />
          </div>
        </Suspense>

        {/* PASS130: Super-App Home — contextual quick actions */}
        <Suspense fallback={null}>
          <div className="mb-6 px-1">
            <SuperAppHome />
          </div>
        </Suspense>
        {error && !loading && (
          <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); }} className="mb-6" />
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.12)", boxShadow: "0 0 12px hsl(var(--primary) / 0.15)" }}>
              <span className="text-xs font-black tracking-tighter" style={{ color: "hsl(var(--primary))" }}>O</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {t("page.dashboard.world_map") || "My World Portfolio"}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {t("page.dashboard.global_overview") || "Global overview — real estate, services & bookings"}
          </p>
        </motion.div>

        {/* Global KPIs */}
        <div className="stat-grid mb-6 sm:mb-8">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 200 }}
              className="h-full"
            >
              <StatCard
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                sub={kpi.sub}
                path={kpi.path}
                loading={loading}
              />
            </motion.div>
          ))}
        </div>

        {/* Orbit Smart Hub — replaces broken 3D globe */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <OrbitSmartHub
              totalProperties={stats.totalProperties}
              totalCountries={stats.totalCountries}
              propertiesByCountry={stats.propertiesByCountry}
            />
          </motion.div>
        )}

        {/* Country Cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="section-block-title mb-4">
            {t("page.dashboard.select_country") || "Select a country to manage"}
          </h2>

          {loading ? (
            <div className="responsive-card-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : stats.propertiesByCountry.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-card rounded-2xl border border-border/50"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("page.dashboard.no_properties") || "No properties or services registered"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                {t("page.dashboard.add_first_hint") || "Add your first property or create a service to get started."}
              </p>
              <Link
                to="/dashboard/add-property"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "var(--shadow-gold)" }}
              >
                <Plus className="h-4 w-4" />
                {t("page.rental.add_property") || "Add a Property"}
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="responsive-card-grid">
                {stats.propertiesByCountry.map((c, i) => (
                  <motion.div
                    key={c.code}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.04, type: "spring", stiffness: 200 }}
                  >
                    <Link
                      to={`/dashboard/country/${c.code.toLowerCase()}`}
                      className="group block bg-card rounded-xl p-5 border border-border/50 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all duration-300 relative overflow-hidden min-h-[88px]"
                    >
                      {/* Hover accent */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-4">
                        <span className="text-4xl shrink-0">{c.flag}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                            {c.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {c.count > 0 && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3.5 w-3.5 shrink-0" />
                                {c.count} {c.count > 1
                                  ? (t("common.properties") || "properties")
                                  : (t("common.property") || "property")}
                              </span>
                            )}
                            {c.tenants > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 shrink-0" />
                                {c.tenants}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Add Property card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + stats.propertiesByCountry.length * 0.04 }}
                className="mt-4"
              >
                <Link
                  to="/dashboard/add-property"
                  className="group flex items-center justify-center gap-3 bg-card rounded-xl p-5 border-2 border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-all duration-300 min-h-[4rem]"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300 shrink-0">
                    <Plus className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground group-hover:text-accent transition-colors">
                    {t("page.rental.add_property") || "Add a Property"}
                  </span>
                </Link>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
