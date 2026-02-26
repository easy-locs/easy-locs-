import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Bell, Check, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    const { data } = await supabase
      .from("reminders")
      .select("id, type, label, next_run_at, active")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("next_run_at", { ascending: true });
    setReminders((data as ReminderRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchReminders(); }, [orgId]);

  const handleDismiss = async (id: string) => {
    await supabase.from("reminders").update({ active: false }).eq("id", id);
    fetchReminders();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("page.reminders.title")}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t("page.reminders.subtitle")}</p>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">{t("page.common.loading")}</div>
        ) : reminders.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("page.reminders.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((r) => {
              const style = typeStyles[r.type] || typeStyles.tax;
              return (
                <div key={r.id} className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card border border-border/50">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.bg}`}>
                    <style.icon className={`h-5 w-5 ${style.text}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{r.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.next_run_at ? new Date(r.next_run_at).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                    {t(style.badgeKey)}
                  </span>
                  <button onClick={() => handleDismiss(r.id)} className="text-muted-foreground hover:text-success transition-colors p-1" title={t("page.reminders.mark_done")}>
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reminders;
