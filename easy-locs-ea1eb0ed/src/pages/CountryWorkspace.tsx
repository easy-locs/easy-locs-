import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Users, KeyRound, FileText, Wallet,
  Wrench, ArrowLeft, Building, Receipt,
  AlertTriangle, CalendarRange, BookOpen, FileCheck,
  Calendar, Sofa, Zap, CheckSquare,
  Bell, Layers, ClipboardCheck,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { SmartActionCard } from "@/components/ui/SmartActionCard";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { getCountryProfile } from "@/lib/country-profile";
import { formatCurrency } from "@/lib/country-config";
import * as cwRepo from "@/repositories/country-workspace.repository";
import { useState, useEffect } from "react";

const CountryWorkspace = () => {
  const { code } = useParams<{ code: string }>();
  const country = code?.toUpperCase() || "FR";
  const { orgId } = useAuth();
  const { t } = useI18n();
  const entry = getCountryEntryOrDefault(country);
  const profile = getCountryProfile(country);

  const [stats, setStats] = useState({
    properties: 0, tenants: 0, leases: 0, documents: 0,
    buildings: 0, inventories: 0, furniture: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    cwRepo.fetchCountryStats(orgId, country).then((result) => {
      setStats(result);
      setLoading(false);
    });
  }, [orgId, country]);

  const cp = (path: string) => `${path}${path.includes("?") ? "&" : "?"}country=${country}`;

  const sections = [
    {
      title: t("section.long_term") || "Long-term",
      description: t("section.long_term_desc") || "Properties, tenants, leases & rent calls",
      items: [
        { icon: Home, label: t("nav.properties") || "Properties", path: cp("/dashboard/rental"), count: stats.properties },
        { icon: Building, label: t("nav.buildings") || "Buildings", path: cp("/dashboard/buildings"), count: stats.buildings },
        { icon: Users, label: t("nav.tenants") || "Tenants", path: cp("/dashboard/tenants"), count: stats.tenants },
        { icon: KeyRound, label: t("nav.leases") || "Leases", path: cp("/dashboard/leases"), count: stats.leases },
        { icon: Bell, label: t("nav.rent_calls") || "Rent Calls", path: cp("/dashboard/reminders") },
        { icon: FileCheck, label: t("nav.receipts") || "Receipts", path: cp("/dashboard/receipts") },
        { icon: AlertTriangle, label: t("nav.dunning") || "Dunning Letters", path: cp("/dashboard/dunning") },
        { icon: Wrench, label: t("nav.interventions") || "Interventions", path: cp("/dashboard/interventions") },
        { icon: ClipboardCheck, label: t("nav.inventory") || "Inventories", path: cp("/dashboard/rental?tab=inventory"), count: stats.inventories },
        { icon: Sofa, label: t("nav.furniture") || "Furniture", path: cp("/dashboard/furniture"), count: stats.furniture },
      ],
    },
    {
      title: t("nav.seasonal") || "Seasonal Rentals",
      description: t("section.seasonal_desc") || "Short-term listings, calendar & pricing",
      items: [
        { icon: Calendar, label: t("nav.seasonal") || "Seasonal Rentals", path: "/dashboard/seasonal" },
        { icon: CalendarRange, label: t("nav.channel_manager") || "Channel Manager", path: "/dashboard/channel-manager" },
        { icon: Zap, label: t("nav.pricing") || "Dynamic Pricing", path: "/dashboard/pricing" },
      ],
    },
    {
      title: "Marketplace",
      description: t("section.marketplace_desc") || "Services & activities",
      items: [
        { icon: Layers, label: t("nav.marketplace") || "Services Marketplace", path: "/dashboard/activities" },
      ],
    },
    {
      title: t("nav.documents") || "Documents",
      description: t("section.documents_desc") || "Legal documents & tasks",
      items: [
        { icon: FileText, label: t("nav.documents") || "Documents", path: cp("/dashboard/documents"), count: stats.documents },
        { icon: CheckSquare, label: t("nav.tasks") || "Tasks", path: cp("/dashboard/tasks") },
      ],
    },
    {
      title: t("section.finance") || "Finance",
      description: t("section.finance_desc") || "Payments, expenses & accounting",
      items: [
        { icon: Wallet, label: t("nav.finances") || "Payments", path: cp("/dashboard/finances") },
        { icon: Receipt, label: t("nav.expenses") || "Expenses", path: cp("/dashboard/expenses") },
        { icon: Layers, label: t("nav.charges") || "Charges Regularization", path: cp("/dashboard/charges") },
        { icon: BookOpen, label: t("nav.accounting") || "Accounting", path: cp("/dashboard/accounting") },
        { icon: FileCheck, label: t("nav.fiscal") || "Fiscal Report", path: cp("/dashboard/fiscal") },
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
            {t("page.dashboard.world_map") || "My World Portfolio"}
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="text-5xl">{entry.flag}</div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{entry.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-medium">{profile.currency} ({profile.currencySymbol})</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{profile.locale}</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{profile.measurementUnit === "metric" ? "Métrique" : "Impérial"}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats — using stat-card class */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {[
            { label: t("nav.properties") || "Properties", value: stats.properties, icon: Home },
            { label: t("nav.tenants") || "Tenants", value: stats.tenants, icon: Users },
            { label: t("nav.leases") || "Leases", value: stats.leases, icon: KeyRound },
            { label: t("nav.documents") || "Documents", value: stats.documents, icon: FileText },
            { label: t("nav.buildings") || "Buildings", value: stats.buildings, icon: Building },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className="stat-card"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground font-medium truncate">{stat.label}</span>
              </div>
              <div className="text-xl font-bold text-foreground tabular-nums mt-auto">
                {loading ? "…" : stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Module Sections — using SmartActionCard */}
        <div className="space-y-8">
          {sections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + si * 0.04 }}
            >
              <div className="mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </h2>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{section.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.items.map((item) => (
                  <SmartActionCard
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    path={item.path}
                    count={"count" in item ? item.count : undefined}
                    loading={loading}
                  />
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
