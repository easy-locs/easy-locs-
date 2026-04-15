import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Plus, Trash2, Check } from "lucide-react";
import { CSS } from "@/config/ui";
import { useI18n } from "@/lib/i18n";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useToast } from "@/hooks/use-toast";

interface Zone { id: string; name: string; radius: number; unit: "km" | "mi"; active: boolean; }

const defaultZones: Zone[] = [
  { id: "z1", name: "City Centre", radius: 5, unit: "km", active: true },
  { id: "z2", name: "Suburbs", radius: 15, unit: "km", active: true },
];

export default function ProviderZones() {
  useUiEngine("provider-zones");
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [zones, setZones] = useState<Zone[]>(defaultZones);
  const [saving, setSaving] = useState(false);

  const addZone = () => {
    setZones(z => [...z, { id: `z${Date.now()}`, name: "New Zone", radius: 10, unit: "km", active: true }]);
  };

  const removeZone = (id: string) => setZones(z => z.filter(zn => zn.id !== id));

  const updateZone = (id: string, updates: Partial<Zone>) => {
    setZones(z => z.map(zn => zn.id === id ? { ...zn, ...updates } : zn));
  };

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    toast({ title: t("provider.zones_saved") || "Service zones saved" });
    setSaving(false);
  };

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{t("provider.service_zones") || "Service Zones"}</h1>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-3 overflow-y-auto">
        <p className="text-xs text-muted-foreground">Define the geographic areas where you offer your services.</p>

        {zones.map(zone => (
          <div key={zone.id} className="rounded-2xl border p-4 space-y-3" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
            <div className="flex items-start justify-between gap-2">
              <input
                type="text"
                value={zone.name}
                onChange={e => updateZone(zone.id, { name: e.target.value })}
                className={`${CSS.formInput} text-sm font-medium flex-1`}
                placeholder="Zone name"
              />
              <button onClick={() => removeZone(zone.id)} className="text-destructive p-1 shrink-0 mt-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">Radius</span>
              <input
                type="number"
                min={1}
                max={500}
                value={zone.radius}
                onChange={e => updateZone(zone.id, { radius: Number(e.target.value) })}
                className={`${CSS.formInput} text-sm w-20`}
              />
              <select
                value={zone.unit}
                onChange={e => updateZone(zone.id, { unit: e.target.value as "km" | "mi" })}
                className={`${CSS.formInput} text-sm`}
              >
                <option value="km">km</option>
                <option value="mi">mi</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateZone(zone.id, { active: !zone.active })}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${zone.active ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {zone.active && <Check className="w-3 h-3" />}
                {zone.active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        ))}

        <button onClick={addZone} className="w-full rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ borderColor: "hsl(var(--border))" }}>
          <Plus className="w-4 h-4" /> Add Zone
        </button>

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? "Saving…" : "Save zones"}
        </button>
      </div>
    </div>
  );
}
