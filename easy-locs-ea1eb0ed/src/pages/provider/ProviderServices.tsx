import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wrench, Plus, Trash2, Edit3, Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number;
  active: boolean;
}

const DEFAULT_SERVICES: Service[] = [
  { id: "s1", name: "Consultation", description: "Initial consultation session", price: 50, currency: "EUR", duration: 30, active: true },
  { id: "s2", name: "Full Service", description: "Complete service package", price: 150, currency: "EUR", duration: 120, active: true },
];

export default function ProviderServices() {
  useUiEngine("provider-services");
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addService = () => {
    const newService: Service = { id: `s${Date.now()}`, name: "New Service", description: "", price: 0, currency: "EUR", duration: 60, active: true };
    setServices(s => [...s, newService]);
    setEditingId(newService.id);
  };

  const removeService = (id: string) => {
    setServices(s => s.filter(sv => sv.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices(s => s.map(sv => sv.id === id ? { ...sv, ...updates } : sv));
  };

  const saveAll = async () => {
    setSaving(true);
    setEditingId(null);
    await new Promise(r => setTimeout(r, 600));
    toast({ title: t("provider.services_saved") || "Services saved" });
    setSaving(false);
  };

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{t("provider.my_services") || "My Services"}</h1>
        </div>
        <div className="ml-auto">
          <button onClick={addService} className="flex items-center gap-1.5 text-xs btn-primary px-3 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-3 overflow-y-auto">
        {services.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">No services yet. Add your first service.</div>
        )}

        {services.map(service => {
          const editing = editingId === service.id;
          return (
            <div key={service.id} className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
              {editing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Editing</span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="p-1 text-green-500"><Check className="w-4 h-4" /></button>
                      <button onClick={() => removeService(service.id)} className="p-1 text-destructive"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <input type="text" value={service.name} onChange={e => updateService(service.id, { name: e.target.value })} className="form-input text-sm w-full" placeholder="Service name" />
                  <textarea value={service.description} onChange={e => updateService(service.id, { description: e.target.value })} className="form-input text-sm w-full resize-none" rows={2} placeholder="Description" />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Price</label>
                      <input type="number" min={0} value={service.price} onChange={e => updateService(service.id, { price: Number(e.target.value) })} className="form-input text-sm w-full" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Duration (min)</label>
                      <input type="number" min={5} step={5} value={service.duration} onChange={e => updateService(service.id, { duration: Number(e.target.value) })} className="form-input text-sm w-full" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{service.name}</p>
                      {!service.active && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inactive</span>}
                    </div>
                    {service.description && <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{service.price} {service.currency}</span>
                      <span>{service.duration} min</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button onClick={() => updateService(service.id, { active: !service.active })} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${service.active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                      {service.active ? "On" : "Off"}
                    </button>
                    <button onClick={() => setEditingId(service.id)} className="p-1 text-muted-foreground hover:text-foreground">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeService(service.id)} className="p-1 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={saveAll} disabled={saving} className="btn-primary w-full mt-2">
          {saving ? "Saving…" : "Save services"}
        </button>
      </div>
    </div>
  );
}
