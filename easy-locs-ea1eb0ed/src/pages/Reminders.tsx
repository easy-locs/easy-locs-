import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Bell, Check, AlertTriangle, Clock } from "lucide-react";
import { dismissReminder } from "@/repositories/rental.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";

const typeStyles: Record<string, { icon: typeof Bell; bg: string; text: string; badgeKey: string }> = {
  "rent-receipt": { icon: AlertTriangle, bg: "bg-destructive/10", text: "text-destructive", badgeKey: "page.reminders.urgent" },
  insurance: { icon: Clock, bg: "bg-warning/10", text: "text-warning", badgeKey: "page.reminders.upcoming" },
  "rent-indexation": { icon: Clock, bg: "bg-warning/10", text: "text-warning", badgeKey: "page.reminders.upcoming" },
  tax: { icon: Bell, bg: "bg-info/10", text: "text-info", badgeKey: "page.reminders.info" },
};

interface ReminderRow {
  id: string;
  type: string;
  label: string;
  next_run_at: string | null;
  active: boolean;
}

const Reminders = () => {
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { orgId } = useAuth();
  const { t } = useI18n();

  const fetchReminders = async () => {
    if (!orgId) return;
    const { fetchRemindersForOrg } = await import("@/repositories/rental.repository");
    const data = await fetchRemindersForOrg(orgId);
    setReminders((data as ReminderRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchReminders(); }, [orgId]);

  const handleDismiss = async (id: string) => {
    await dismissReminder(id);
    fetchReminders();
  };

  return (
    <DashboardLayout>
      <div className="page-content-sm">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="page-header">
            <h1>{t("page.reminders.title")}</h1>
            <p>{t("page.reminders.subtitle")}</p>
          </div>
        </motion.div>

        {loading ? (
          <div className="empty-state"><p className="empty-state-text">{t("page.common.loading")}</p></div>
        ) : reminders.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="empty-state ui-card">
            <Bell className="empty-state-icon" />
            <p className="empty-state-text">{t("page.reminders.empty")}</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {reminders.map((r, idx) => {
              const style = typeStyles[r.type] || typeStyles.tax;
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="ui-card flex items-center gap-4 group hover:shadow-card-hover hover:border-accent/30 transition-all">
                  <div className={`icon-box ${style.bg}`}>
                    <style.icon className={`h-4 w-4 ${style.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{r.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.next_run_at ? new Date(r.next_run_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <span className={`badge-status ${style.bg} ${style.text}`}>
                    {t(style.badgeKey)}
                  </span>
                  <button onClick={() => handleDismiss(r.id)} className="text-muted-foreground hover:text-success transition-colors p-1 opacity-0 group-hover:opacity-100" title={t("page.reminders.mark_done")}>
                    <Check className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reminders;
