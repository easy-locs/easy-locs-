import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MerchantBusinessHoursPage() {
  useUiEngine("merchant-merchantbusinesshourspage");
  const navigate = useNavigate();
  const [hours, setHours] = useState<Record<string, { open: string; close: string; enabled: boolean }>>(
    DAYS.reduce((acc, day) => {
      acc[day] = { open: "10:00", close: "23:00", enabled: true };
      return acc;
    }, {} as Record<string, { open: string; close: string; enabled: boolean }>)
  );

  const update = (day: string, key: "open" | "close" | "enabled", value: string | boolean) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));
  };

  const save = () => {
    toast.success("Business hours saved");
    navigate(-1);
  };

  return (
    <SubPageShell>
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Business Hours" subtitle="Set opening times" onBack={() => navigate(-1)} />

      <div className="space-y-3">
        {DAYS.map((day) => (
          <div key={day} className="rounded-[28px] border border-border/20 bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-foreground">{day}</div>
              <button onClick={() => update(day, "enabled", !hours[day].enabled)} className="rounded-2xl bg-muted px-3 py-2 text-sm font-bold text-foreground">
                {hours[day].enabled ? "Open" : "Closed"}
              </button>
            </div>
            <div className="flex gap-2">
              <input value={hours[day].open} onChange={(e) => update(day, "open", e.target.value)} className="flex-1 rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="time" />
              <input value={hours[day].close} onChange={(e) => update(day, "close", e.target.value)} className="flex-1 rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="time" />
            </div>
          </div>
        ))}
      </div>

      <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
        Save Hours
      </button>
      </div>
    </SubPageShell>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
