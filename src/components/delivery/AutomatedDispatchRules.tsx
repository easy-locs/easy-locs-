/**
 * AutomatedDispatchRules — Configurable dispatch rules: zone priority, vehicle, schedule, fallback.
 * PASS85-FF: Automated Dispatch Rules
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, MapPin, Truck, Clock, Zap, Plus, Trash2, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DispatchRule {
  id: string;
  name: string;
  priority: number;
  active: boolean;
  conditions: {
    zones?: string[];
    vehicleTypes?: string[];
    timeWindows?: { start: string; end: string }[];
    maxDistanceKm?: number;
    minRating?: number;
    minAcceptanceRate?: number;
    priorityLevels?: string[];
  };
  actions: {
    autoAssign: boolean;
    broadcastRadius: number;
    maxOfferTimeSeconds: number;
    fallbackEnabled: boolean;
    fallbackDelaySeconds: number;
    fallbackExpandRadius: number;
  };
}

const DEFAULT_RULE: Omit<DispatchRule, "id"> = {
  name: "",
  priority: 1,
  active: true,
  conditions: {
    zones: [],
    vehicleTypes: ["car"],
    maxDistanceKm: 15,
    minRating: 3.0,
    minAcceptanceRate: 50,
    priorityLevels: ["standard"],
  },
  actions: {
    autoAssign: false,
    broadcastRadius: 10,
    maxOfferTimeSeconds: 120,
    fallbackEnabled: true,
    fallbackDelaySeconds: 180,
    fallbackExpandRadius: 25,
  },
};

export default function AutomatedDispatchRules({ orgId }: { orgId: string }) {
  const [rules, setRules] = useState<DispatchRule[]>([
    {
      id: "default",
      name: "Règle par défaut",
      priority: 100,
      active: true,
      conditions: { vehicleTypes: ["car", "scooter", "bike"], maxDistanceKm: 20, minRating: 3.0, minAcceptanceRate: 40, priorityLevels: ["standard", "express", "urgent"] },
      actions: { autoAssign: false, broadcastRadius: 15, maxOfferTimeSeconds: 120, fallbackEnabled: true, fallbackDelaySeconds: 180, fallbackExpandRadius: 30 },
    },
    {
      id: "express",
      name: "Livraisons express",
      priority: 10,
      active: true,
      conditions: { vehicleTypes: ["scooter", "car"], maxDistanceKm: 10, minRating: 4.0, minAcceptanceRate: 70, priorityLevels: ["express", "urgent"] },
      actions: { autoAssign: true, broadcastRadius: 8, maxOfferTimeSeconds: 60, fallbackEnabled: true, fallbackDelaySeconds: 90, fallbackExpandRadius: 20 },
    },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [zoneInput, setZoneInput] = useState("");

  const addRule = () => {
    if (!newRuleName.trim()) { toast.error("Nom requis"); return; }
    const rule: DispatchRule = {
      ...DEFAULT_RULE,
      id: crypto.randomUUID(),
      name: newRuleName.trim(),
      priority: rules.length + 1,
      conditions: { ...DEFAULT_RULE.conditions },
      actions: { ...DEFAULT_RULE.actions },
    };
    setRules(prev => [...prev, rule]);
    setNewRuleName("");
    setShowCreate(false);
    toast.success("Règle créée");
  };

  const deleteRule = (id: string) => {
    if (id === "default") { toast.error("Impossible de supprimer la règle par défaut"); return; }
    setRules(prev => prev.filter(r => r.id !== id));
    toast("Règle supprimée");
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const updateCondition = (id: string, key: string, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, conditions: { ...r.conditions, [key]: value } } : r));
  };

  const updateAction = (id: string, key: string, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, actions: { ...r.actions, [key]: value } } : r));
  };

  const vehicleOptions = [
    { value: "bike", label: "🚲 Vélo" },
    { value: "scooter", label: "🛵 Scooter" },
    { value: "car", label: "🚗 Voiture" },
  ];

  const priorityOptions = [
    { value: "standard", label: "Standard" },
    { value: "express", label: "Express" },
    { value: "urgent", label: "Urgent" },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Settings className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
          Règles de dispatch ({rules.length})
        </h3>
        <Button size="sm" className="text-[10px] h-7 px-3" onClick={() => setShowCreate(!showCreate)}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Plus className="h-3 w-3 mr-1" /> Nouvelle
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-cyan) / 0.15)" }}>
              <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Nom de la règle</Label>
              <div className="flex gap-2">
                <Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)}
                  placeholder="Ex: Zone centre express"
                  className="h-8 text-xs flex-1"
                  style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                <Button size="sm" className="h-8 text-[10px] px-3" onClick={addRule}
                  style={{ background: "hsl(var(--success))", color: "#fff" }}>Créer</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      <div className="rounded-lg px-3 py-2"
        style={{ background: "hsl(var(--info) / 0.05)", border: "1px solid hsl(var(--info) / 0.1)" }}>
        <p className="text-[9px]" style={{ color: "hsl(var(--info))" }}>
          <Shield className="h-3 w-3 inline mr-1" />
          Les règles s'appliquent par ordre de priorité. La première règle correspondante est utilisée. Le fallback élargit automatiquement la recherche.
        </p>
      </div>

      {/* Rules list */}
      <div className="space-y-2">
        {rules.sort((a, b) => a.priority - b.priority).map(rule => {
          const isExpanded = expandedId === rule.id;
          return (
            <div key={rule.id} className="rounded-xl overflow-hidden"
              style={{
                background: "hsl(var(--hud-surface))",
                border: `1px solid ${rule.active ? "hsl(var(--hud-border) / 0.08)" : "hsl(var(--destructive) / 0.15)"}`,
                opacity: rule.active ? 1 : 0.6,
              }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : rule.id)}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                  {rule.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{rule.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {rule.conditions.vehicleTypes?.map(v => (
                      <span key={v} className="text-[8px] px-1 py-0.5 rounded"
                        style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                        {v}
                      </span>
                    ))}
                    {rule.actions.autoAssign && (
                      <span className="text-[8px] px-1 py-0.5 rounded"
                        style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                        <Zap className="h-2 w-2 inline" /> Auto
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={e => { e.stopPropagation(); toggleRule(rule.id); }}
                    className="w-8 h-4 rounded-full transition-all relative"
                    style={{ background: rule.active ? "hsl(var(--success))" : "hsl(var(--hud-border) / 0.2)" }}>
                    <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                      style={{ left: rule.active ? "calc(100% - 14px)" : "2px" }} />
                  </button>
                  {isExpanded ? <ChevronUp className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} /> : <ChevronDown className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />}
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                      {/* Conditions */}
                      <div className="pt-2">
                        <p className="text-[9px] font-bold mb-2" style={{ color: "hsl(var(--hud-cyan))" }}>CONDITIONS</p>

                        {/* Vehicle types */}
                        <div className="space-y-1 mb-2">
                          <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Véhicules</Label>
                          <div className="flex gap-1">
                            {vehicleOptions.map(v => (
                              <button key={v.value} onClick={() => {
                                const current = rule.conditions.vehicleTypes || [];
                                const next = current.includes(v.value) ? current.filter(x => x !== v.value) : [...current, v.value];
                                updateCondition(rule.id, "vehicleTypes", next);
                              }}
                                className="text-[9px] px-2 py-1 rounded-lg transition-all"
                                style={{
                                  background: rule.conditions.vehicleTypes?.includes(v.value) ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-bg))",
                                  border: `1px solid ${rule.conditions.vehicleTypes?.includes(v.value) ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.08)"}`,
                                  color: rule.conditions.vehicleTypes?.includes(v.value) ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
                                }}>
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Priority levels */}
                        <div className="space-y-1 mb-2">
                          <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Niveaux de priorité</Label>
                          <div className="flex gap-1">
                            {priorityOptions.map(p => (
                              <button key={p.value} onClick={() => {
                                const current = rule.conditions.priorityLevels || [];
                                const next = current.includes(p.value) ? current.filter(x => x !== p.value) : [...current, p.value];
                                updateCondition(rule.id, "priorityLevels", next);
                              }}
                                className="text-[9px] px-2 py-1 rounded-lg transition-all"
                                style={{
                                  background: rule.conditions.priorityLevels?.includes(p.value) ? "hsl(var(--warning) / 0.1)" : "hsl(var(--hud-bg))",
                                  border: `1px solid ${rule.conditions.priorityLevels?.includes(p.value) ? "hsl(var(--warning) / 0.3)" : "hsl(var(--hud-border) / 0.08)"}`,
                                  color: rule.conditions.priorityLevels?.includes(p.value) ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.5)",
                                }}>
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sliders */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Distance max</Label>
                            <div className="flex items-center gap-1 mt-0.5">
                              <input type="range" min={1} max={50} value={rule.conditions.maxDistanceKm || 15}
                                onChange={e => updateCondition(rule.id, "maxDistanceKm", +e.target.value)}
                                className="w-full h-1 rounded-full appearance-none" style={{ background: "hsl(var(--hud-border) / 0.15)" }} />
                              <span className="text-[8px] font-bold w-8 text-right" style={{ color: "hsl(var(--hud-cyan))" }}>
                                {rule.conditions.maxDistanceKm}km
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Note min</Label>
                            <div className="flex items-center gap-1 mt-0.5">
                              <input type="range" min={0} max={5} step={0.5} value={rule.conditions.minRating || 0}
                                onChange={e => updateCondition(rule.id, "minRating", +e.target.value)}
                                className="w-full h-1 rounded-full appearance-none" style={{ background: "hsl(var(--hud-border) / 0.15)" }} />
                              <span className="text-[8px] font-bold w-6 text-right" style={{ color: "hsl(var(--warning))" }}>
                                {rule.conditions.minRating}
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Accept. min</Label>
                            <div className="flex items-center gap-1 mt-0.5">
                              <input type="range" min={0} max={100} step={5} value={rule.conditions.minAcceptanceRate || 0}
                                onChange={e => updateCondition(rule.id, "minAcceptanceRate", +e.target.value)}
                                className="w-full h-1 rounded-full appearance-none" style={{ background: "hsl(var(--hud-border) / 0.15)" }} />
                              <span className="text-[8px] font-bold w-8 text-right" style={{ color: "hsl(var(--success))" }}>
                                {rule.conditions.minAcceptanceRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <p className="text-[9px] font-bold mb-2" style={{ color: "hsl(var(--success))" }}>ACTIONS</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                            style={{ background: "hsl(var(--hud-bg))" }}>
                            <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Auto-assign</span>
                            <button onClick={() => updateAction(rule.id, "autoAssign", !rule.actions.autoAssign)}
                              className="w-7 h-3.5 rounded-full transition-all relative"
                              style={{ background: rule.actions.autoAssign ? "hsl(var(--success))" : "hsl(var(--hud-border) / 0.2)" }}>
                              <div className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all"
                                style={{ left: rule.actions.autoAssign ? "calc(100% - 12px)" : "2px" }} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                            style={{ background: "hsl(var(--hud-bg))" }}>
                            <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Fallback</span>
                            <button onClick={() => updateAction(rule.id, "fallbackEnabled", !rule.actions.fallbackEnabled)}
                              className="w-7 h-3.5 rounded-full transition-all relative"
                              style={{ background: rule.actions.fallbackEnabled ? "hsl(var(--success))" : "hsl(var(--hud-border) / 0.2)" }}>
                              <div className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all"
                                style={{ left: rule.actions.fallbackEnabled ? "calc(100% - 12px)" : "2px" }} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            { label: "Rayon broadcast", value: rule.actions.broadcastRadius, key: "broadcastRadius", unit: "km", max: 50 },
                            { label: "Timeout offre", value: rule.actions.maxOfferTimeSeconds, key: "maxOfferTimeSeconds", unit: "s", max: 600 },
                            { label: "Délai fallback", value: rule.actions.fallbackDelaySeconds, key: "fallbackDelaySeconds", unit: "s", max: 600 },
                          ].map(({ label, value, key, unit, max }) => (
                            <div key={key}>
                              <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{label}</Label>
                              <Input type="number" value={value} onChange={e => updateAction(rule.id, key, +e.target.value)}
                                className="h-6 text-[9px] mt-0.5"
                                style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                              <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delete */}
                      {rule.id !== "default" && (
                        <Button size="sm" variant="ghost" className="w-full text-[10px] h-7"
                          onClick={() => deleteRule(rule.id)}
                          style={{ color: "hsl(var(--destructive))" }}>
                          <Trash2 className="h-3 w-3 mr-1" /> Supprimer cette règle
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
