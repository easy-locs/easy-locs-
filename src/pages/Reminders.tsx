import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Bell, Check, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const typeStyles: Record<string, { icon: typeof Bell; bg: string; text: string; badge: string }> = {
  "rent-receipt": { icon: AlertTriangle, bg: "bg-destructive/10", text: "text-destructive", badge: "Urgent" },
  insurance: { icon: Clock, bg: "bg-warning/10", text: "text-warning", badge: "À venir" },
  "rent-indexation": { icon: Clock, bg: "bg-warning/10", text: "text-warning", badge: "À venir" },
  tax: { icon: Bell, bg: "bg-info/10", text: "text-info", badge: "Info" },
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
        <h1 className="text-2xl font-bold text-foreground mb-1">Rappels</h1>
        <p className="text-muted-foreground text-sm mb-8">Ne manquez aucune échéance administrative.</p>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
        ) : reminders.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun rappel actif.</p>
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
                    {style.badge}
                  </span>
                  <button onClick={() => handleDismiss(r.id)} className="text-muted-foreground hover:text-success transition-colors p-1" title="Marquer comme fait">
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
