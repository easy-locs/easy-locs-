import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Bell, Check, AlertTriangle, Clock } from "lucide-react";
import { getReminders, setReminders as saveReminders } from "@/lib/store";

const typeStyles: Record<string, { icon: typeof Bell; bg: string; text: string; badge: string }> = {
  "rent-receipt": { icon: AlertTriangle, bg: "bg-destructive/10", text: "text-destructive", badge: "Urgent" },
  insurance: { icon: Clock, bg: "bg-warning/10", text: "text-warning", badge: "À venir" },
  "rent-indexation": { icon: Clock, bg: "bg-warning/10", text: "text-warning", badge: "À venir" },
  tax: { icon: Bell, bg: "bg-info/10", text: "text-info", badge: "Info" },
};

const Reminders = () => {
  const [, setRefresh] = useState(0);
  const reminders = getReminders().filter((r) => r.active);

  const handleDismiss = (id: string) => {
    const all = getReminders().map((r) => (r.id === id ? { ...r, active: false } : r));
    saveReminders(all);
    setRefresh((x) => x + 1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Rappels</h1>
        <p className="text-muted-foreground text-sm mb-8">Ne manquez aucune échéance administrative.</p>

        {reminders.length === 0 ? (
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
                    <div className="text-xs text-muted-foreground">{r.nextRunAt}</div>
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
