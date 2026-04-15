import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { CSS } from "@/config/ui";
import { useI18n } from "@/lib/i18n";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useToast } from "@/hooks/use-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface TimeSlot { from: string; to: string; }
interface DaySchedule { enabled: boolean; slots: TimeSlot[]; }

const defaultSchedule = (): Record<string, DaySchedule> =>
  Object.fromEntries(DAYS.map(d => [d, { enabled: d !== "Sunday", slots: [{ from: "09:00", to: "18:00" }] }]));

export default function ProviderAvailability() {
  useUiEngine("provider-availability");
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(defaultSchedule());
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    setSchedule(s => ({ ...s, [day]: { ...s[day], enabled: !s[day].enabled } }));
  };

  const addSlot = (day: string) => {
    setSchedule(s => ({ ...s, [day]: { ...s[day], slots: [...s[day].slots, { from: "09:00", to: "17:00" }] } }));
  };

  const removeSlot = (day: string, idx: number) => {
    setSchedule(s => ({ ...s, [day]: { ...s[day], slots: s[day].slots.filter((_, i) => i !== idx) } }));
  };

  const updateSlot = (day: string, idx: number, field: "from" | "to", value: string) => {
    setSchedule(s => {
      const slots = [...s[day].slots];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...s, [day]: { ...s[day], slots } };
    });
  };

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    toast({ title: t("provider.availability_saved") || "Availability saved" });
    setSaving(false);
  };

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{t("provider.availability") || "Availability"}</h1>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-3 overflow-y-auto">
        {DAYS.map(day => {
          const ds = schedule[day];
          return (
            <div key={day} className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">{day}</span>
                <button
                  onClick={() => toggleDay(day)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${ds.enabled ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${ds.enabled ? "translate-x-4" : ""}`} />
                </button>
              </div>
              {ds.enabled && (
                <div className="space-y-2">
                  {ds.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input type="time" value={slot.from} onChange={e => updateSlot(day, idx, "from", e.target.value)} className={`${CSS.formInput} text-xs py-1 flex-1`} />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input type="time" value={slot.to} onChange={e => updateSlot(day, idx, "to", e.target.value)} className={`${CSS.formInput} text-xs py-1 flex-1`} />
                      {ds.slots.length > 1 && (
                        <button onClick={() => removeSlot(day, idx)} className="text-destructive p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addSlot(day)} className="flex items-center gap-1 text-xs text-primary mt-1">
                    <Plus className="w-3 h-3" /> Add slot
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <button onClick={save} disabled={saving} className="btn-primary w-full mt-2">
          {saving ? "Saving…" : (t("common.save") || "Save availability")}
        </button>
      </div>
    </div>
  );
}
