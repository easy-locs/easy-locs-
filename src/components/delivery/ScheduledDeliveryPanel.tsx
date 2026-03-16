/**
 * ScheduledDeliveryPanel — Schedule recurring/future deliveries.
 * PASS80-M: Scheduled Deliveries
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Plus, Repeat, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useSellerDelivery, type CreateJobPayload } from "@/hooks/useSellerDelivery";

interface Props {
  onDone?: () => void;
}

export default function ScheduledDeliveryPanel({ onDone }: Props) {
  const { createJob } = useSellerDelivery();
  const [form, setForm] = useState({
    pickup_address: "",
    dropoff_address: "",
    package_description: "",
    delivery_fee: 5,
    scheduled_date: "",
    scheduled_time: "",
    recurrence: "none" as "none" | "daily" | "weekly" | "monthly",
    recurrence_count: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.pickup_address || !form.dropoff_address) { toast.error("Adresses requises"); return; }
    if (!form.scheduled_date) { toast.error("Date requise"); return; }

    setSubmitting(true);
    try {
      const count = form.recurrence === "none" ? 1 : Math.min(form.recurrence_count, 30);

      for (let i = 0; i < count; i++) {
        const baseDate = new Date(form.scheduled_date + "T" + (form.scheduled_time || "09:00"));
        if (form.recurrence === "daily") baseDate.setDate(baseDate.getDate() + i);
        else if (form.recurrence === "weekly") baseDate.setDate(baseDate.getDate() + i * 7);
        else if (form.recurrence === "monthly") baseDate.setMonth(baseDate.getMonth() + i);

        const payload: CreateJobPayload = {
          pickup_address: form.pickup_address,
          dropoff_address: form.dropoff_address,
          package_description: form.package_description || undefined,
          delivery_fee: form.delivery_fee,
          scheduled_at: baseDate.toISOString(),
          priority: "standard",
        };
        await createJob(payload);
      }

      haptic("medium");
      toast.success(`${count} mission${count > 1 ? "s" : ""} programmée${count > 1 ? "s" : ""} !`);
      onDone?.();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
        <Calendar className="h-3.5 w-3.5" style={{ color: "hsl(var(--info))" }} />
        Livraison programmée
      </h3>

      <div className="space-y-2.5">
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Retrait *</Label>
          <Input value={form.pickup_address} onChange={e => set("pickup_address", e.target.value)}
            placeholder="Adresse de retrait" className="h-9 text-xs mt-1"
            style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Livraison *</Label>
          <Input value={form.dropoff_address} onChange={e => set("dropoff_address", e.target.value)}
            placeholder="Adresse de livraison" className="h-9 text-xs mt-1"
            style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Date *</Label>
            <Input type="date" value={form.scheduled_date} onChange={e => set("scheduled_date", e.target.value)}
              className="h-9 text-xs mt-1"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Heure</Label>
            <Input type="time" value={form.scheduled_time} onChange={e => set("scheduled_time", e.target.value)}
              className="h-9 text-xs mt-1"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
            <Input value={form.package_description} onChange={e => set("package_description", e.target.value)}
              placeholder="Type de colis" className="h-9 text-xs mt-1"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Frais (€)</Label>
            <Input type="number" step="0.5" value={form.delivery_fee} onChange={e => set("delivery_fee", +e.target.value)}
              className="h-9 text-xs mt-1"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
        </div>

        {/* Recurrence */}
        <div className="rounded-lg p-3" style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
          <p className="text-[10px] font-semibold flex items-center gap-1 mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
            <Repeat className="h-3 w-3" /> Récurrence
          </p>
          <div className="flex gap-1.5">
            {(["none", "daily", "weekly", "monthly"] as const).map(r => (
              <button key={r} onClick={() => set("recurrence", r)}
                className="flex-1 py-1.5 rounded-md text-[9px] font-semibold transition-all"
                style={{
                  background: form.recurrence === r ? "hsl(var(--info) / 0.12)" : "transparent",
                  color: form.recurrence === r ? "hsl(var(--info))" : "hsl(var(--hud-text-dim) / 0.5)",
                  border: `1px solid ${form.recurrence === r ? "hsl(var(--info) / 0.2)" : "hsl(var(--hud-border) / 0.08)"}`,
                }}>
                {r === "none" ? "Une fois" : r === "daily" ? "Quotidien" : r === "weekly" ? "Hebdo" : "Mensuel"}
              </button>
            ))}
          </div>
          {form.recurrence !== "none" && (
            <div className="mt-2 flex items-center gap-2">
              <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Nombre :</Label>
              <Input type="number" min={1} max={30} value={form.recurrence_count}
                onChange={e => set("recurrence_count", Math.min(30, +e.target.value))}
                className="h-7 w-16 text-xs"
                style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
              <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                ({form.recurrence_count} mission{form.recurrence_count > 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>
      </div>

      <Button className="w-full text-xs h-9 font-semibold" onClick={handleSubmit} disabled={submitting}
        style={{ background: "hsl(var(--info))", color: "#fff" }}>
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
          <><Send className="h-3.5 w-3.5 mr-1" /> Programmer{form.recurrence !== "none" ? ` (${form.recurrence_count}x)` : ""}</>
        )}
      </Button>
    </div>
  );
}
