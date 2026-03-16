/**
 * ReturnsReverseLogistics — Returns and reverse logistics management.
 * Return requests, labels, tracking, refund flow.
 * PASS88-SS: Returns & Reverse Logistics
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Package, Truck, CheckCircle2, Clock, XCircle, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface ReturnRequest {
  id: string;
  orderId: string;
  reason: string;
  description: string;
  status: "requested" | "approved" | "pickup_scheduled" | "in_transit" | "received" | "refunded" | "rejected";
  createdAt: string;
  refundAmount: number;
  returnLabel?: string;
  pickupDate?: string;
  items: string[];
}

const STATUS_FLOW: { key: ReturnRequest["status"]; label: string; emoji: string; color: string }[] = [
  { key: "requested", label: "Demandé", emoji: "📝", color: "hsl(var(--warning))" },
  { key: "approved", label: "Approuvé", emoji: "✅", color: "hsl(var(--success))" },
  { key: "pickup_scheduled", label: "Collecte planifiée", emoji: "📅", color: "hsl(var(--info))" },
  { key: "in_transit", label: "En transit", emoji: "🚗", color: "hsl(var(--hud-cyan))" },
  { key: "received", label: "Reçu", emoji: "📦", color: "hsl(var(--success))" },
  { key: "refunded", label: "Remboursé", emoji: "💰", color: "hsl(var(--hud-cyan))" },
];

const RETURN_REASONS = [
  "Produit endommagé", "Produit incorrect", "Ne correspond pas", "Défectueux",
  "Changement d'avis", "Taille incorrecte", "Meilleur prix ailleurs",
];

export default function ReturnsReverseLogistics({ orgId }: { orgId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [returns, setReturns] = useState<ReturnRequest[]>([
    { id: "ret1", orderId: "ORD-2024-0891", reason: "Produit endommagé", description: "Coin du carton écrasé, article cassé", status: "in_transit", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), refundAmount: 45.90, returnLabel: "RL-88291", pickupDate: new Date(Date.now() - 86400000).toISOString(), items: ["Lampe déco", "Support mural"] },
    { id: "ret2", orderId: "ORD-2024-0856", reason: "Ne correspond pas", description: "Couleur différente de la photo", status: "refunded", createdAt: new Date(Date.now() - 86400000 * 8).toISOString(), refundAmount: 29.00, returnLabel: "RL-87104", items: ["Coussin velours"] },
    { id: "ret3", orderId: "ORD-2024-0923", reason: "Changement d'avis", description: "", status: "requested", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), refundAmount: 18.50, items: ["Bougie parfumée"] },
  ]);
  const [form, setForm] = useState({ orderId: "", reason: RETURN_REASONS[0], description: "", items: "" });

  const stats = useMemo(() => ({
    total: returns.length,
    pending: returns.filter(r => ["requested", "approved", "pickup_scheduled"].includes(r.status)).length,
    inTransit: returns.filter(r => r.status === "in_transit").length,
    refunded: returns.filter(r => r.status === "refunded").length,
    totalRefunded: returns.filter(r => r.status === "refunded").reduce((s, r) => s + r.refundAmount, 0),
  }), [returns]);

  const submitReturn = () => {
    if (!form.orderId) { toast.error("Numéro de commande requis"); return; }
    haptic("medium");
    setReturns(prev => [{
      id: `ret-${Date.now()}`, orderId: form.orderId, reason: form.reason,
      description: form.description, status: "requested",
      createdAt: new Date().toISOString(), refundAmount: 0,
      items: form.items.split(",").map(i => i.trim()).filter(Boolean),
    }, ...prev]);
    setShowForm(false);
    setForm({ orderId: "", reason: RETURN_REASONS[0], description: "", items: "" });
    toast.success("Demande de retour soumise");
  };

  const getStatusIndex = (status: ReturnRequest["status"]) => STATUS_FLOW.findIndex(s => s.key === status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Retours & Logistique inverse</h3>
        </div>
        <Button size="sm" className="text-[9px] h-6 px-2" onClick={() => setShowForm(!showForm)}
          style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
          <Plus className="w-2.5 h-2.5 mr-0.5" /> Nouveau retour
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, color: "--info" },
          { label: "En cours", value: stats.pending, color: "--warning" },
          { label: "Transit", value: stats.inTransit, color: "--hud-cyan" },
          { label: "Remboursé", value: `${stats.totalRefunded.toFixed(0)}€`, color: "--success" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-cyan) / 0.1)" }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>N° Commande</Label>
              <Input value={form.orderId} onChange={e => setForm(p => ({ ...p, orderId: e.target.value }))}
                placeholder="ORD-2024-XXXX" className="h-7 text-[10px]"
                style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
            </div>
            <div>
              <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Raison</Label>
              <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full h-7 text-[10px] rounded-md px-2" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
                {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Articles (séparés par virgule)</Label>
            <Input value={form.items} onChange={e => setForm(p => ({ ...p, items: e.target.value }))}
              placeholder="Article 1, Article 2" className="h-7 text-[10px]"
              style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
          </div>
          <div>
            <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} className="text-[10px]" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-[9px] h-7" onClick={submitReturn}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>Soumettre</Button>
            <Button size="sm" variant="outline" className="text-[9px] h-7" onClick={() => setShowForm(false)}
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text-dim))" }}>Annuler</Button>
          </div>
        </motion.div>
      )}

      {/* Returns list */}
      <div className="space-y-2">
        {returns.map((ret, i) => {
          const statusIdx = getStatusIndex(ret.status);
          const statusCfg = STATUS_FLOW.find(s => s.key === ret.status) || STATUS_FLOW[0];
          return (
            <motion.div key={ret.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${statusCfg.color}20` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{ret.orderId}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{ret.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold" style={{ color: statusCfg.color }}>{statusCfg.emoji} {statusCfg.label}</p>
                  {ret.refundAmount > 0 && <p className="text-[8px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{ret.refundAmount.toFixed(2)}€</p>}
                </div>
              </div>

              {/* Items */}
              {ret.items.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ret.items.map(item => (
                    <span key={item} className="text-[7px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text-dim))" }}>{item}</span>
                  ))}
                </div>
              )}

              {/* Progress timeline */}
              {ret.status !== "rejected" && (
                <div className="flex items-center gap-0.5">
                  {STATUS_FLOW.map((step, si) => (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{
                        background: si <= statusIdx ? statusCfg.color : "hsl(var(--hud-border) / 0.15)",
                      }} />
                      {si < STATUS_FLOW.length - 1 && (
                        <div className="flex-1 h-0.5" style={{
                          background: si < statusIdx ? statusCfg.color : "hsl(var(--hud-border) / 0.1)",
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Return label */}
              {ret.returnLabel && (
                <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                  <QrCode className="w-3 h-3" style={{ color: "hsl(var(--info))" }} />
                  <span className="text-[8px] font-mono" style={{ color: "hsl(var(--info))" }}>{ret.returnLabel}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
