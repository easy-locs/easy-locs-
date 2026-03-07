import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Globe, ArrowRight, Building, Users, TrendingUp,
  BrainCircuit, Clock, PiggyBank, Percent, Euro,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import WorldPropertyMap from "@/components/dashboard/WorldPropertyMap";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";

const Dashboard = () => {
  const { orgId, userCountry } = useAuth();
  const { t } = useI18n();
  const fmt = (n: number) => formatCurrency(n, userCountry);

  const [stats, setStats] = useState({
    totalProperties: 0,
    totalTenants: 0,
    propertiesByCountry: [] as { code: string; count: number; flag: string; name: string; tenants: number; buildings: number }[],
    revenueThisMonth: 0,
    unpaidTotal: 0,
    occupancyRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("properties").select("id, country").eq("org_id", orgId),
      supabase.from("tenants").select("id, property_id, lease_end").eq("org_id", orgId),
      supabase.from("buildings").select("id, org_id").eq("org_id", orgId),
      supabase.from("rent_calls").select("month, paid, total_amount").eq("org_id", orgId),
    ]).then(([props, tenantsRes, buildingsRes, rc]) => {
      const propData = (props.data || []) as { id: string; country: string }[];
      const tenantsList = (tenantsRes.data || []) as { id: string; property_id: string | null; lease_end: string | null }[];
      const buildingsData = (buildingsRes.data || []);

      // Aggregate by country
      const countryMap = new Map<string, { count: number; propIds: Set<string> }>();
      propData.forEach(p => {
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
            t => t.property_id && data.propIds.has(t.property_id) && (!t.lease_end || t.lease_end >= today)
          );
          return {
            code,
            count: data.count,
            flag: entry.flag,
            name: entry.name,
            tenants: countryTenants.length,
            buildings: 0, // simplified
          };
        })
        .sort((a, b) => b.count - a.count);

      const currentMonth = format(new Date(), "yyyy-MM");
      const monthCalls = ((rc.data || []) as any[]).filter((r: any) => r.month === currentMonth);
      const revenueThisMonth = monthCalls.filter((r: any) => r.paid).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const unpaidTotal = ((rc.data || []) as any[]).filter((r: any) => !r.paid).reduce((s: number, r: any) => s + Number(r.total_amount), 0);

      const occupiedProps = new Set(
        tenantsList.filter(t => t.property_id && (!t.lease_end || t.lease_end >= today)).map(t => t.property_id)
      ).size;
      const occupancyRate = propData.length > 0 ? Math.round((occupiedProps / propData.length) * 100) : 0;

      setStats({
        totalProperties: propData.length,
        totalTenants: tenantsList.length,
        propertiesByCountry,
        revenueThisMonth,
        unpaidTotal,
        occupancyRate,
      });
      setLoading(false);
    });
  }, [orgId]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Globe className="h-6 w-6 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">
              {t("page.dashboard.world_map") || "Mon portefeuille mondial"}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-9">
            {loading ? "..." : `${stats.totalProperties} ${stats.totalProperties > 1 ? "biens" : "bien"} · ${stats.propertiesByCountry.length} ${stats.propertiesByCountry.length > 1 ? "pays" : "pays"} · ${stats.totalTenants} ${t("page.dashboard.tenants_count") || "locataires"}`}
          </p>
        </motion.div>

        {/* Global KPIs - compact row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Building, label: t("page.dashboard.properties") || "Biens", value: loading ? "..." : String(stats.totalProperties) },
            { icon: Euro, label: t("page.dashboard.collected_month") || "Encaissé ce mois", value: loading ? "..." : fmt(stats.revenueThisMonth) },
            { icon: Percent, label: t("page.dashboard.occupancy") || "Occupation", value: loading ? "..." : `${stats.occupancyRate}%` },
            { icon: PiggyBank, label: t("page.dashboard.unpaid_amount") || "Impayés", value: loading ? "..." : fmt(stats.unpaidTotal) },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className="stat-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium truncate">{stat.label}</span>
              </div>
              <div className="text-xl font-bold text-foreground mt-auto tabular-nums">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* 3D Globe — Interactive world portfolio */}
        {!loading && stats.propertiesByCountry.length > 0 && (
          <WorldPropertyMap
            propertiesByCountry={stats.propertiesByCountry}
            userCountry={userCountry}
          />
        )}

        {/* Country Cards — Main Hub */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            {t("page.dashboard.select_country") || "Sélectionnez un pays"}
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : stats.propertiesByCountry.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border/50">
              <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("page.dashboard.no_properties") || "Aucun bien enregistré"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("page.dashboard.add_first") || "Ajoutez votre premier bien pour commencer"}
              </p>
              <Link to="/dashboard/rental" className="btn-primary">
                {t("page.rental.add_property") || "Ajouter un bien"}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.propertiesByCountry.map((c, i) => (
                <motion.div
                  key={c.code}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                >
                  <Link
                    to={`/dashboard/country/${c.code.toLowerCase()}`}
                    className="group block bg-card rounded-xl p-5 border border-border/50 shadow-card hover:shadow-card-hover hover:border-accent/40 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-4xl shrink-0">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                          {c.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building className="h-3.5 w-3.5" />
                            {c.count} {c.count > 1 ? "biens" : "bien"}
                          </span>
                          {c.tenants > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {c.tenants}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* AI Assistant CTA */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-8">
          <Link
            to="/dashboard/assistant"
            className="flex items-center gap-4 bg-hero rounded-xl p-5 text-primary-foreground hover:opacity-95 transition-opacity"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
              <BrainCircuit className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{t("page.dashboard.ai_question") || "Posez une question"}</h3>
              <p className="text-sm text-primary-foreground/60">{t("page.dashboard.ai_desc") || "Assistant IA immobilier"}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary-foreground/40" />
          </Link>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
