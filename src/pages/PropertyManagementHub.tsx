/**
 * PropertyManagementHub — V5 with integrated portfolio.
 * Route: /property-hub
 */
import { useState, useEffect } from "react";
import SecurityGate from "@/components/security/SecurityGate";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/error-state";
import OrbitSmartHub from "@/components/dashboard/OrbitSmartHub";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { format } from "date-fns";
import {
  Building2, User, LayoutDashboard, Home, Users, Receipt,
  Wrench, FileText, Calculator, Megaphone, Globe, Building, MapPin, TrendingUp, Wallet, Plus,
  ArrowLeft, ChevronRight, KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";

type PMRole = null | "landlord" | "tenant";
type CountryStat = { code: string; count: number; flag: string; name: string; tenants: number };

const landlordNav = [
  { label: "Portfolio", desc: "All your properties", icon: Building2, path: "/dashboard/properties" },
  { label: "Buildings & Units", desc: "Units & floors", icon: Home, path: "/dashboard/buildings" },
  { label: "Tenants", desc: "Tenant directory", icon: Users, path: "/dashboard/tenants" },
  { label: "Rent Tracking", desc: "Payments & notices", icon: Receipt, path: "/dashboard/payment-notices" },
  { label: "Maintenance", desc: "Requests & interventions", icon: Wrench, path: "/dashboard/interventions" },
  { label: "Documents", desc: "Leases, contracts, files", icon: FileText, path: "/dashboard/documents" },
  { label: "Accounting", desc: "Revenue & expenses", icon: Calculator, path: "/dashboard/accounting" },
  { label: "Publish Listings", desc: "Advertise vacancies", icon: Megaphone, path: "/dashboard/real-estate" },
];

const tenantNav = [
  { label: "My Property", desc: "Your current home", icon: Home, path: "/tenant" },
  { label: "My Rent", desc: "Receipts & history", icon: Receipt, path: "/tenant/receipts" },
  { label: "Payments", desc: "Pay rent & bills", icon: Wallet, path: "/dashboard/wallet?context=rent" },
  { label: "Maintenance Requests", desc: "Report issues", icon: Wrench, path: "/tenant/requests" },
  { label: "Documents", desc: "Lease & shared files", icon: FileText, path: "/tenant/documents" },
];

export default function PropertyManagementHub() {
  const [role, setRole] = useState<PMRole>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { orgId } = useAuth();
  const { t } = useI18n();
  const { fmtLocal, code: userCurrencyCode } = usePlatformCurrency();
  const { balance } = useWallet();

  const [stats, setStats] = useState({ totalProperties: 0, totalCountries: 0, revenueThisMonth: 0, propertiesByCountry: [] as CountryStat[] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const timeout = setTimeout(() => setLoading(false), 8000);
    Promise.all([
      supabase.from("properties").select("id, country").eq("org_id", orgId),
      supabase.from("tenants").select("id, property_id, lease_end").eq("org_id", orgId),
      supabase.from("rent_calls").select("month, paid, total_amount").eq("org_id", orgId),
    ]).then(([props, tenantsRes, rc]) => {
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
          return { code, count: data.count, flag: entry.flag, name: entry.name, tenants: countryTenants.length };
        })
        .sort((a, b) => b.count - a.count);
      const currentMonth = format(new Date(), "yyyy-MM");
      const monthCalls = ((rc.data || []) as Array<{ month: string; paid: boolean; total_amount: number | string }>).filter(
        (r) => r.month === currentMonth
      );
      const revenueThisMonth = monthCalls.filter((r) => r.paid).reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
      setStats({ totalProperties: propData.length, totalCountries: countryMap.size, revenueThisMonth, propertiesByCountry });
      setLoading(false);
    }).catch((err) => {
      clearTimeout(timeout);
      console.error("[PropertyHub] data fetch error:", err);
      setError("Failed to load data");
      setLoading(false);
    });
    return () => clearTimeout(timeout);
  }, [orgId]);

  useEffect(() => {
    if ((location.state as { propertyHubExit?: boolean } | null)?.propertyHubExit) {
      setRole(null);
      window.scrollTo(0, 0);
    }
  }, [location.state]);

  const navItems = role === "landlord" ? landlordNav : role === "tenant" ? tenantNav : [];

  const kpis = [
    { icon: Building, label: t("page.dashboard.properties") || "Properties", value: String(stats.totalProperties), path: "/dashboard/properties", sub: "View all →" },
    { icon: MapPin, label: t("page.dashboard.countries") || "Countries", value: String(stats.totalCountries), sub: "Select below" },
    { icon: TrendingUp, label: "Collected", value: fmtLocal(stats.revenueThisMonth), path: "/dashboard/receipts", sub: "This month →" },
    { icon: Wallet, label: `Wallet (${userCurrencyCode})`, value: fmtLocal(balance?.balance || 0), path: "/dashboard/wallet", sub: "Open →" },
  ];

  return (
    <SecurityGate label="Property Management" timeoutMinutes={10}>
    <>
      <SEOHead title="Property Management" description="Manage your properties and tenancies." />
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader
          title={role ? (role === "landlord" ? "Landlord Hub" : "Tenant Hub") : "Property Management"}
          icon={<Building2 className="h-5 w-5 text-primary" />}
          backTo="/dashboard"
          onBack={role ? () => { setRole(null); window.scrollTo(0, 0); } : undefined}
        />

        <div className="max-w-lg mx-auto px-4 py-4">
          {/* ── Step 1: Role selection ── */}
          {!role && (
            <div className="space-y-6">
              <div className="text-center space-y-2 pt-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto shadow-lg shadow-primary/10">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Property Management</h2>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">Choose your role to access your workspace</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setRole("landlord")}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-2xl",
                    "bg-card border border-border/50",
                    "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
                    "active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                  )}
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    <KeyRound className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-bold">Landlord</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Manage properties, tenants, rent & maintenance</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-all" />
                </button>

                <button
                  onClick={() => setRole("tenant")}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-2xl",
                    "bg-card border border-border/50",
                    "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
                    "active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                  )}
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center shrink-0">
                    <User className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-bold">Tenant</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">View rent, payments, documents & requests</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-all" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Role workspace ── */}
          {role && (
            <div className="space-y-4">

              {/* ── Portfolio KPIs (landlord only) ── */}
              {role === "landlord" && (
                <>
                  {error && !loading && (
                    <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); }} className="mb-4" />
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {kpis.map((kpi, i) => (
                      <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.04 }}
                      >
                        <StatCard icon={kpi.icon} label={kpi.label} value={kpi.value} sub={kpi.sub} path={kpi.path} loading={loading} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Orbit Smart Hub */}
                  {!loading && stats.totalProperties > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-4">
                      <OrbitSmartHub totalProperties={stats.totalProperties} totalCountries={stats.totalCountries} propertiesByCountry={stats.propertiesByCountry} />
                    </motion.div>
                  )}

                  {/* Country cards */}
                  {!loading && stats.propertiesByCountry.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Select a country</h3>
                      <div className="space-y-2">
                        {stats.propertiesByCountry.map((c) => (
                          <Link
                            key={c.code}
                            to={`/dashboard/country/${c.code.toLowerCase()}`}
                            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 active:scale-[0.98] transition-all group"
                          >
                            <span className="text-2xl shrink-0">{c.flag}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-0.5"><Building className="h-3 w-3" /> {c.count}</span>
                                {c.tenants > 0 && <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {c.tenants}</span>}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Add property CTA */}
                  <Link
                    to="/dashboard/property/add"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all mb-4"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Add a Property</span>
                  </Link>
                </>
              )}

              {/* ── Navigation items ── */}
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3.5 p-3.5 rounded-xl",
                        "bg-card border border-border/40",
                        "hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
                        "active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                      )}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold truncate">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
    </SecurityGate>
  );
}
