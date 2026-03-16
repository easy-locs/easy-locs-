/**
 * OnboardingChecklist — Dashboard widget showing setup progress
 * Appears for landlord users who haven't completed all setup steps.
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Building, Users, FileText, CreditCard, MessageSquare,
  Sparkles, X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  route: string;
  done: boolean;
}

const OnboardingChecklist = () => {
  const { orgId, user } = useAuth();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [counts, setCounts] = useState({
    properties: 0,
    tenants: 0,
    documents: 0,
    ownerProfile: false,
    payments: 0,
    messages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !user) { setLoading(false); return; }

    // Check if dismissed via localStorage
    const key = `easylocs_checklist_dismissed_${user.id}`;
    if (localStorage.getItem(key) === "true") {
      setDismissed(true);
      setLoading(false);
      return;
    }

    Promise.all([
      supabase.from("properties").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("tenants").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("owner_profiles").select("id").eq("org_id", orgId).limit(1).maybeSingle(),
      supabase.from("rent_calls").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    ]).then(([props, tenants, docs, owner, payments, messages]) => {
      setCounts({
        properties: props.count ?? 0,
        tenants: tenants.count ?? 0,
        documents: docs.count ?? 0,
        ownerProfile: !!owner.data,
        payments: payments.count ?? 0,
        messages: messages.count ?? 0,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [orgId, user]);

  const items: ChecklistItem[] = useMemo(() => [
    {
      id: "property",
      label: "Ajouter un bien",
      description: "Créez votre premier bien immobilier",
      icon: Building,
      route: "/dashboard/property-management",
      done: counts.properties > 0,
    },
    {
      id: "tenant",
      label: "Ajouter un locataire",
      description: "Enregistrez votre premier locataire",
      icon: Users,
      route: "/dashboard/rental?tab=tenants",
      done: counts.tenants > 0,
    },
    {
      id: "document",
      label: "Générer un document",
      description: "Bail, quittance, état des lieux…",
      icon: FileText,
      route: "/dashboard/documents",
      done: counts.documents > 0,
    },
    {
      id: "payment",
      label: "Configurer les loyers",
      description: "Appels de loyer automatiques",
      icon: CreditCard,
      route: "/dashboard/rental?tab=payments",
      done: counts.payments > 0,
    },
    {
      id: "communication",
      label: "Envoyer un message",
      description: "Utilisez le centre de communication",
      icon: MessageSquare,
      route: "/dashboard/communication",
      done: counts.messages > 0,
    },
  ], [counts]);

  const doneCount = items.filter(i => i.done).length;
  const progress = Math.round((doneCount / items.length) * 100);
  const allDone = doneCount === items.length;

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`easylocs_checklist_dismissed_${user.id}`, "true");
    }
    setDismissed(true);
  };

  if (loading || dismissed || !orgId) return null;
  // Auto-dismiss if all steps done
  if (allDone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl shadow-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Configuration</h3>
            <p className="text-xs text-muted-foreground">{doneCount}/{items.length} étapes complétées</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={handleDismiss} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <Progress value={progress} className="h-1.5" />
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.route}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all group ${
                      item.done
                        ? "opacity-60"
                        : "hover:bg-muted"
                    }`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-accent transition-colors" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OnboardingChecklist;
