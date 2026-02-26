import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText, Home, Bell, FolderLock, BrainCircuit, ArrowRight,
  AlertTriangle, TrendingUp, Clock, Users, Euro, Building,
  Download, PiggyBank,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { exportToCSV } from "@/lib/csv-export";

const quickActions = [
  { icon: FileText, label: "Générer une quittance", path: "/dashboard/receipts", color: "bg-info/10 text-info" },
  { icon: Home, label: "Créer un bail", path: "/dashboard/leases", color: "bg-success/10 text-success" },
  { icon: Bell, label: "Voir les rappels", path: "/dashboard/reminders", color: "bg-warning/10 text-warning" },
  { icon: FolderLock, label: "Mon coffre-fort", path: "/dashboard/vault", color: "bg-accent/10 text-gold-dark" },
];

const Dashboard = () => {
  const { orgId } = useAuth();
  const [stats, setStats] = useState({
    properties: 0, tenants: 0, documents: 0,
    rentCalls: [] as { month: string; paid: boolean; total_amount: number }[],
    reminders: 0, vaultFiles: 0, vaultSize: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("properties").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("tenants").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("rent_calls").select("month, paid, total_amount").eq("org_id", orgId),
      supabase.from("reminders").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("active", true),
      supabase.from("vault_files").select("size").eq("org_id", orgId),
    ]).then(([props, tenants, docs, rc, rem, vault]) => {
      const vaultFiles = vault.data || [];
      setStats({
        properties: props.count || 0,
        tenants: tenants.count || 0,
        documents: docs.count || 0,
        rentCalls: (rc.data || []) as any,
        reminders: rem.count || 0,
        vaultFiles: vaultFiles.length,
        vaultSize: vaultFiles.reduce((s, f) => s + (Number(f.size) || 0), 0),
      });
      setLoading(false);
    });
  }, [orgId]);

  const kpis = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const monthCalls = stats.rentCalls.filter(r => r.month === currentMonth);
    const revenueThisMonth = monthCalls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
    const unpaidTotal = stats.rentCalls.filter(r => !r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
    const totalRevenue = stats.rentCalls.filter(r => r.paid).reduce((s, r) => s + Number(r.total_amount), 0);
    return { revenueThisMonth, unpaidTotal, totalRevenue };
  }, [stats.rentCalls]);

  const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const fmtSize = (bytes: number) => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} Mo` : `${(bytes / 1024).toFixed(0)} Ko`;

  const upcomingActions = useMemo(() => {
    const actions: { label: string; date: string; urgent: boolean }[] = [];
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const unpaidThisMonth = stats.rentCalls.filter(r => r.month === currentMonth && !r.paid).length;
    if (unpaidThisMonth > 0) {
      actions.push({ label: `${unpaidThisMonth} loyer(s) impayé(s) ce mois`, date: format(now, "MMMM yyyy", { locale: fr }), urgent: true });
    }
    if (stats.reminders > 0) {
      actions.push({ label: `${stats.reminders} rappel(s) actif(s)`, date: "À traiter", urgent: false });
    }
    if (actions.length === 0) {
      actions.push({ label: "Tout est à jour ! 🎉", date: "", urgent: false });
    }
    return actions;
  }, [stats]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Bonjour 👋</h1>
          <p className="text-muted-foreground mb-8">Voici un résumé de votre situation.</p>
        </motion.div>

        {/* Stats cards — real data */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Building, label: "Biens", value: loading ? "..." : String(stats.properties), sub: `${stats.tenants} locataire(s)` },
            { icon: Euro, label: "Encaissé ce mois", value: loading ? "..." : fmt(kpis.revenueThisMonth), sub: kpis.unpaidTotal > 0 ? `${fmt(kpis.unpaidTotal)} impayés` : "0 impayé" },
            { icon: FileText, label: "Documents", value: loading ? "..." : String(stats.documents), sub: "générés" },
            { icon: FolderLock, label: "Coffre-fort", value: loading ? "..." : fmtSize(stats.vaultSize), sub: `${stats.vaultFiles} fichier(s)` },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-card rounded-xl p-5 shadow-card border border-border/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="group bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover transition-all flex flex-col items-center text-center gap-3"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
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
              <h3 className="font-semibold text-lg">Que dois-je faire maintenant ?</h3>
              <p className="text-sm text-primary-foreground/60">L'IA analyse votre situation et vous propose des actions.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary-foreground/60" />
          </Link>
        </motion.div>

        {/* Alerts & actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Alertes & actions</h2>
          <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
            {upcomingActions.map((r, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                {r.urgent ? (
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                ) : (
                  <Bell className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{r.label}</div>
                  {r.date && <div className="text-xs text-muted-foreground">{r.date}</div>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Legal disclaimer */}
        <div className="mt-10 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cette application fournit une assistance administrative uniquement.
            Les documents générés sont à titre informatif et ne remplacent pas un avocat, un notaire ou un expert-comptable.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
