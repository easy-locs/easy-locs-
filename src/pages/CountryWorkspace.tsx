import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Users, KeyRound, FileText, Wallet, ClipboardList,
  MessageCircle, Wrench, ArrowLeft, Building, Receipt,
  AlertTriangle, CalendarRange, BookOpen, FileCheck,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { getCountryProfile } from "@/lib/country-profile";
import { formatCurrency } from "@/lib/country-config";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo } from "react";

const CountryWorkspace = () => {
  const { code } = useParams<{ code: string }>();
  const country = code?.toUpperCase() || "FR";
  const { orgId } = useAuth();
  const { t } = useI18n();
  const entry = getCountryEntryOrDefault(country);
  const profile = getCountryProfile(country);
  const fmt = (n: number) => formatCurrency(n, country);

  const [stats, setStats] = useState({
    properties: 0, tenants: 0, leases: 0, documents: 0,
    buildings: 0, revenue: 0, unpaid: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("properties").select("id", { count: "exact" }).eq("org_id", orgId).eq("country", country),
      supabase.from("tenants").select("id, property_id").eq("org_id", orgId),
      supabase.from("leases").select("id", { count: "exact" }).eq("org_id", orgId).eq("country", country),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("country", country),
      supabase.from("buildings").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    ]).then(([props, tenants, leases, docs, buildings]) => {
      // Filter tenants by properties in this country
      const propIds = new Set((props.data || []).map(p => p.id));
      const countryTenants = (tenants.data || []).filter(t => t.property_id && propIds.has(t.property_id));

      setStats({
        properties: props.count || 0,
        tenants: countryTenants.length,
        leases: leases.count || 0,
        documents: docs.count || 0,
        buildings: buildings.count || 0,
        revenue: 0,
        unpaid: 0,
      });
      setLoading(false);
    });
  }, [orgId, country]);

  const sections = [
    {
      title: t("nav.properties") || "Biens",
      items: [
        { icon: Home, label: t("nav.properties") || "Biens", path: `/dashboard/rental?tab=properties&country=${country}`, count: stats.properties },
        { icon: Building, label: t("nav.buildings") || "Immeubles", path: `/dashboard/buildings?country=${country}`, count: stats.buildings },
      ],
    },
    {
      title: t("nav.tenants") || "Locataires",
      items: [
        { icon: Users, label: t("nav.tenants") || "Locataires", path: `/dashboard/rental?tab=tenants&country=${country}`, count: stats.tenants },
        { icon: KeyRound, label: t("nav.leases") || "Baux", path: `/dashboard/leases?country=${country}`, count: stats.leases },
        { icon: ClipboardList, label: t("nav.inventory") || "États des lieux", path: `/dashboard/rental?tab=inventory&country=${country}` },
      ],
    },
    {
      title: "Finance",
      items: [
        { icon: Wallet, label: t("nav.finances") || "Revenus", path: `/dashboard/finances?country=${country}` },
        { icon: Receipt, label: t("nav.expenses") || "Dépenses", path: `/dashboard/expenses?country=${country}` },
        { icon: BookOpen, label: "Comptabilité", path: `/dashboard/accounting?country=${country}` },
        { icon: FileCheck, label: t("nav.fiscal") || "Fiscal", path: `/dashboard/fiscal?country=${country}` },
        { icon: AlertTriangle, label: t("nav.dunning") || "Relances", path: `/dashboard/dunning?country=${country}` },
      ],
    },
    {
      title: "Documents",
      items: [
        { icon: FileText, label: t("nav.documents") || "Documents", path: `/dashboard/documents?country=${country}`, count: stats.documents },
      ],
    },
    {
      title: "Communication",
      items: [
        { icon: MessageCircle, label: t("nav.messages") || "Messages", path: `/dashboard/messages?country=${country}` },
        { icon: Wrench, label: t("nav.interventions") || "Interventions", path: `/dashboard/interventions?country=${country}` },
      ],
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Back + Country Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("page.dashboard.world_map") || "Mon portefeuille mondial"}
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="text-5xl">{entry.flag}</div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{entry.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="badge-info">{profile.currency} ({profile.currencySymbol})</span>
                <span className="badge-neutral">{profile.locale}</span>
                <span className="badge-neutral">{profile.measurementUnit === "metric" ? "Métrique" : "Impérial"}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: t("nav.properties") || "Biens", value: stats.properties, icon: Home },
            { label: t("nav.tenants") || "Locataires", value: stats.tenants, icon: Users },
            { label: t("nav.leases") || "Baux", value: stats.leases, icon: KeyRound },
            { label: t("nav.documents") || "Documents", value: stats.documents, icon: FileText },
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
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-auto">
                {loading ? "..." : stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Navigation Sections */}
        <div className="space-y-6">
          {sections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + si * 0.04 }}
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="group flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                      <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                    </div>
                    {"count" in item && item.count !== undefined && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                        {item.count}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CountryWorkspace;
