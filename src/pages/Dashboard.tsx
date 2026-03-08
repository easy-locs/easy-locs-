import { useState, useEffect, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  Globe, Building, Users, MapPin, Plus, TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";

type CountryStat = {
  code: string;
  count: number;
  flag: string;
  name: string;
  tenants: number;
};

type WorldMapProps = {
  propertiesByCountry: CountryStat[];
  userCountry: string;
};

const Dashboard = () => {
  const { orgId, userCountry } = useAuth();
  const { t } = useI18n();
  const fmt = (n: number) => formatCurrency(n, userCountry || "FR");

  const [stats, setStats] = useState({
    totalProperties: 0,
    totalCountries: 0,
    revenueThisMonth: 0,
    propertiesByCountry: [] as CountryStat[],
  });
  const [loading, setLoading] = useState(true);
  const [WorldMapComponent, setWorldMapComponent] = useState<ComponentType<WorldMapProps> | null>(null);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    import("@/components/dashboard/WorldPropertyMap")
      .then((mod) => { if (active) setWorldMapComponent(() => mod.default); })
      .catch(() => { if (active) setMapLoadFailed(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }

    Promise.all([
      supabase.from("properties").select("id, country").eq("org_id", orgId),
      supabase.from("tenants").select("id, property_id, lease_end").eq("org_id", orgId),
      supabase.from("rent_calls").select("month, paid, total_amount").eq("org_id", orgId),
    ])
      .then(([props, tenantsRes, rc]) => {
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
        console.error("[Dashboard] data fetch error:", err);
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
            {t("page.dashboard.global_overview") || "Vue d'ensemble globale — immobilier, services et réservations"}
          </p>
        </motion.div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Building, label: t("page.dashboard.properties") || "Biens", value: loading ? "..." : String(stats.totalProperties) },
            { icon: MapPin, label: t("page.dashboard.countries") || "Pays actifs", value: loading ? "..." : String(stats.totalCountries) },
            { icon: TrendingUp, label: t("page.dashboard.collected_month") || "Encaissé ce mois", value: loading ? "..." : fmt(stats.revenueThisMonth) },
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

        {/* 3D Globe */}
        {!loading && stats.propertiesByCountry.length > 0 && WorldMapComponent && !mapLoadFailed && (
          <WorldMapComponent
            propertiesByCountry={stats.propertiesByCountry}
            userCountry={userCountry || "FR"}
          />
        )}

        {!loading && stats.propertiesByCountry.length > 0 && mapLoadFailed && (
          <div className="mb-8 rounded-xl border border-border/50 bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Carte mondiale indisponible sur cet appareil.
            </p>
          </div>
        )}

        {/* Country Cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            {t("page.dashboard.select_country") || "Sélectionnez un pays pour gérer"}
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : stats.propertiesByCountry.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border/50">
              <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("page.dashboard.no_properties") || "Aucun bien ou service enregistré"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Ajoutez votre premier bien ou créez un service pour commencer
              </p>
              <Link to="/dashboard/add-property" className="btn-primary">
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
                    <div className="flex items-center gap-4">
                      <span className="text-4xl shrink-0">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                          {c.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {c.count > 0 && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3.5 w-3.5" />
                              {c.count} {c.count > 1 ? "biens" : "bien"}
                            </span>
                          )}
                          {c.tenants > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {c.tenants}
                            </span>
                          )}
                          {c.services > 0 && (
                            <span className="flex items-center gap-1">
                              <Store className="h-3.5 w-3.5" />
                              {c.services} services
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* Add Property card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + stats.propertiesByCountry.length * 0.04 }}
              >
                <Link
                  to="/dashboard/add-property"
                  className="group flex items-center justify-center gap-3 bg-card rounded-xl p-5 border-2 border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-all h-full min-h-[5rem]"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Plus className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground group-hover:text-accent transition-colors">
                    {t("page.rental.add_property") || "Ajouter un bien"}
                  </span>
                </Link>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
