import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Bell, Check, AlertTriangle, Clock } from "lucide-react";

const reminders = [
  { id: 1, label: "Quittance de loyer — Apt. Paris 11e", date: "1er mars 2026", type: "urgent" as const },
  { id: 2, label: "Renouvellement assurance habitation", date: "15 mars 2026", type: "upcoming" as const },
  { id: 3, label: "Indexation loyer (IRL) — Apt. Paris 11e", date: "1er avril 2026", type: "upcoming" as const },
  { id: 4, label: "Déclaration revenus fonciers", date: "Mai 2026", type: "info" as const },
];

const typeStyles = {
  urgent: { icon: AlertTriangle, bg: "bg-destructive/10", text: "text-destructive", badge: "Urgent" },
  upcoming: { icon: Clock, bg: "bg-warning/10", text: "text-warning", badge: "À venir" },
  info: { icon: Bell, bg: "bg-info/10", text: "text-info", badge: "Info" },
};

const Reminders = () => {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Rappels</h1>
        <p className="text-muted-foreground text-sm mb-8">Ne manquez aucune échéance administrative.</p>

        <div className="space-y-3">
          {reminders.map((r) => {
            const style = typeStyles[r.type];
            return (
              <div
                key={r.id}
                className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card border border-border/50"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.bg}`}>
                  <style.icon className={`h-5 w-5 ${style.text}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.date}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {style.badge}
                </span>
                <button className="text-muted-foreground hover:text-success transition-colors p-1">
                  <Check className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reminders;
