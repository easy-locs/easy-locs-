/**
 * OnboardingChecklist — Dashboard widget showing setup progress.
 * Pure shell — all projection logic in dashboard.read-model.ts,
 * all actions in dashboard.actions.ts.
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
import * as checklistRepo from "@/repositories/onboarding-checklist.repository";
import { projectChecklist } from "@/families/dashboard/dashboard.read-model";
import { dismissChecklist, isChecklistDismissed } from "@/families/dashboard/dashboard.actions";

const ICON_MAP: Record<string, React.ElementType> = {
  Building, Users, FileText, CreditCard, MessageSquare,
};

const OnboardingChecklist = () => {
  const { orgId, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [counts, setCounts] = useState({
    properties: 0, tenants: 0, documents: 0,
    ownerProfile: false, payments: 0, messages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !user) { setLoading(false); return; }
    if (isChecklistDismissed(user.id)) {
      setDismissed(true);
      setLoading(false);
      return;
    }
    checklistRepo.fetchChecklistCounts(orgId).then(setCounts).catch(() => {}).finally(() => setLoading(false));
  }, [orgId, user]);

  const model = useMemo(() => projectChecklist(counts), [counts]);

  const handleDismiss = () => {
    if (user) dismissChecklist(user.id);
    setDismissed(true);
  };

  if (loading || dismissed || !orgId || model.allDone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl shadow-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm font-bold text-foreground">Configuration</h3>
            <p className="line-clamp-2 text-xs text-muted-foreground">{model.doneCount}/{model.totalCount} étapes complétées</p>
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
        <Progress value={model.progress} className="h-1.5" />
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
              {model.items.map((item) => {
                const Icon = ICON_MAP[item.iconKey] || Building;
                return (
                  <Link
                    key={item.id}
                    to={item.route}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all group ${
                      item.done ? "opacity-60" : "hover:bg-muted"
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
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
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
