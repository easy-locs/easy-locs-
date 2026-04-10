/**
 * CreateJobForm — Extracted from SellerLogisticsPanel.
 * Single responsibility: delivery job creation form.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PackageSizePicker from "@/components/delivery/PackageSizePicker";
import type { CreateJobPayload } from "@/hooks/useSellerDelivery";

interface Props {
  onSubmit: (p: CreateJobPayload) => Promise<void>;
  onCancel: () => void;
}

export default function CreateJobForm({ onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<CreateJobPayload>({
    pickup_address: "", dropoff_address: "", package_description: "",
    weight_kg: 1, priority: "standard", delivery_fee: 5, currency: "EUR", notes: "",
    package_size: "medium", pricing_mode: "fixed",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.pickup_address || !form.dropoff_address) { toast.error("Adresses requises"); return; }
    setSubmitting(true);
    try { await onSubmit(form); toast.success("Mission créée !"); onCancel(); }
    catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { setSubmitting(false); }
  };

  const set = (k: keyof CreateJobPayload, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}
    >
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
        <Plus className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Nouvelle mission
      </h3>

      <div className="space-y-2.5">
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Adresse de retrait *</Label>
          <Input value={form.pickup_address} onChange={e => set("pickup_address", e.target.value)}
            placeholder="123 Rue du Commerce, Paris"
            className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Adresse de livraison *</Label>
          <Input value={form.dropoff_address} onChange={e => set("dropoff_address", e.target.value)}
            placeholder="45 Avenue de la Liberté, Lyon"
            className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Description colis</Label>
            <Input value={form.package_description} onChange={e => set("package_description", e.target.value)}
              placeholder="Carton 30x20"
              className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Poids (kg)</Label>
            <Input type="number" value={form.weight_kg} onChange={e => set("weight_kg", +e.target.value)}
              className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Taille du colis</Label>
          <div className="mt-1">
            <PackageSizePicker value={form.package_size || "medium"} onChange={v => set("package_size", v)} />
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Mode tarifaire</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button type="button" onClick={() => set("pricing_mode", "fixed")}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition-all min-h-[40px]"
              style={{
                borderColor: form.pricing_mode === "fixed" ? "hsl(var(--accent))" : "hsl(var(--hud-border) / 0.15)",
                background: form.pricing_mode === "fixed" ? "hsl(var(--accent) / 0.1)" : "transparent",
                color: form.pricing_mode === "fixed" ? "hsl(var(--accent))" : "hsl(var(--hud-text-dim))",
              }}>
              📦 Prix fixe
            </button>
            <button type="button" onClick={() => set("pricing_mode", "progressive")}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition-all min-h-[40px]"
              style={{
                borderColor: form.pricing_mode === "progressive" ? "hsl(var(--accent))" : "hsl(var(--hud-border) / 0.15)",
                background: form.pricing_mode === "progressive" ? "hsl(var(--accent) / 0.1)" : "transparent",
                color: form.pricing_mode === "progressive" ? "hsl(var(--accent))" : "hsl(var(--hud-text-dim))",
              }}>
              📍 Par km
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Priorité</Label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)}
              className="w-full h-9 text-xs mt-1 rounded-md px-2"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))", border: "1px solid" }}>
              <option value="standard">🟢 Standard</option>
              <option value="express">🟠 Express</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Frais livraison (€)</Label>
            <Input type="number" step="0.5" value={form.delivery_fee} onChange={e => set("delivery_fee", +e.target.value)}
              className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Notes</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Instructions spéciales…" rows={2}
            className="text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1 text-xs h-9" onClick={handleSubmit} disabled={submitting}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Send className="h-3.5 w-3.5 mr-1" /> {submitting ? "Création…" : "Créer la mission"}
        </Button>
        <Button size="sm" variant="outline" className="text-xs h-9" onClick={onCancel}
          style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text-dim))" }}>
          Annuler
        </Button>
      </div>
    </motion.div>
  );
}
