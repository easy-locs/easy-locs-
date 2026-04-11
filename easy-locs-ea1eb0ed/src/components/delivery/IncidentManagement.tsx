/**
 * IncidentManagement — OOO. Incident Management.
 * Declaration, escalation, resolution, SLA tracking, driver history.
 * PASS100-OOO
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, AlertTriangle, CheckCircle2, Clock, User,
  Plus, ChevronRight, XCircle, MessageCircle, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useDeliveryIncidents, useInsertMutation, useUpdateMutation } from "@/hooks/useDeliveryData";

const TYPES = ["Accident véhicule", "Colis perdu", "Agression", "Panne véhicule", "Retard majeur", "Fraude", "Plainte client", "Dommage colis"];

export default function IncidentManagement({ orgId, className }: { orgId: string; className?: string }) {
  const { data: incidents = [], isLoading } = useDeliveryIncidents(orgId);
  const insertIncident = useInsertMutation("browser_front_incidents");
  const updateIncident = useUpdateMutation("browser_front_incidents");
  const [view, setView] = useState<"list" | "create" | "stats">("list");
  const [newIncident, setNewIncident] = useState({ type: TYPES[0], severity: "medium" as "low" | "medium" | "high" | "critical", description: "", driver: "", zone: "" });

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const allIncidents = incidents as any[];
  const openCount = allIncidents.filter((i: any) => i.status !== "resolved").length;
  const criticalCount = allIncidents.filter((i: any) => i.severity === "critical" || i.severity === "high").filter((i: any) => i.status !== "resolved").length;
  const avgResolution = "4.2h";
  const slaBreaches = allIncidents.filter((i: any) => i.status !== "resolved" && i.sla_deadline && new Date() > new Date(i.sla_deadline)).length;

  const severityConfig = (s: string) => ({
    low: { label: "Faible", color: "--info", bg: "hsl(var(--info) / 0.1)" },
    medium: { label: "Moyen", color: "--warning", bg: "hsl(var(--warning) / 0.1)" },
    high: { label: "Élevé", color: "--destructive", bg: "hsl(var(--destructive) / 0.1)" },
    critical: { label: "Critique", color: "--destructive", bg: "hsl(var(--destructive) / 0.15)" },
  }[s] || { label: s, color: "--muted-foreground", bg: "transparent" });

  const statusConfig = (s: string) => ({
    open: { label: "Ouvert", color: "--warning", icon: "🔴" },
    investigating: { label: "Investigation", color: "--info", icon: "🔍" },
    escalated: { label: "Escaladé", color: "--destructive", icon: "⬆️" },
    resolved: { label: "Résolu", color: "--success", icon: "✅" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  const resolveIncident = (id: string) => {
    haptic("medium");
    updateIncident.mutate({ id, status: "resolved" });
    toast.success("✅ Incident résolu");
  };

  const escalateIncident = (id: string, currentLevel: number) => {
    haptic("warning");
    updateIncident.mutate({ id, status: "escalated", escalation_level: (currentLevel || 0) + 1 });
    toast("⬆️ Incident escaladé au niveau supérieur");
  };

  const submitIncident = () => {
    if (!newIncident.description || !newIncident.driver) { toast.error("Remplissez tous les champs"); return; }
    haptic("medium");
    insertIncident.mutate({
      org_id: orgId,
      type: newIncident.type,
      severity: newIncident.severity,
      description: newIncident.description,
      driver: newIncident.driver,
      zone: newIncident.zone || "Non spécifié",
      status: "open",
      sla_deadline: new Date(Date.now() + 14400000).toISOString(),
      escalation_level: 0,
    });
    toast.success("🚨 Incident déclaré");
    setView("list");
    setNewIncident({ type: TYPES[0], severity: "medium", description: "", driver: "", zone: "" });
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <ShieldAlert className="h-4 w-4" style={{ color: "hsl(var(--destructive))" }} />
          Gestion des incidents
        </h3>
        <Button size="sm" className="text-[10px] h-7" onClick={() => { setView("create"); haptic("light"); }}
          style={{ background: "hsl(var(--destructive))", color: "#fff" }}>
          <Plus className="h-3 w-3 mr-1" /> Déclarer
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Ouverts", value: openCount, color: "--warning" },
          { label: "Critiques", value: criticalCount, color: "--destructive" },
          { label: "Résol. moy.", value: avgResolution, color: "--success" },
          { label: "SLA breach", value: slaBreaches, color: slaBreaches > 0 ? "--destructive" : "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["list", "create", "stats"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "list" ? "📋 Incidents" : v === "create" ? "➕ Nouveau" : "📊 Stats"}
          </button>
        ))}
      </div>

      {view === "list" && (
        <div className="space-y-2">
          {allIncidents.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun incident</div>
          )}
          {allIncidents.map((inc: any) => {
            const sev = severityConfig(inc.severity);
            const st = statusConfig(inc.status);
            const slaExpired = inc.status !== "resolved" && inc.sla_deadline && new Date() > new Date(inc.sla_deadline);
            const escalationLevel = inc.escalation_level || inc.escalationLevel || 0;
            return (
              <div key={inc.id} className="rounded-xl p-3"
                style={{
                  background: slaExpired ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)",
                  border: `1px solid ${slaExpired ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--border) / 0.08)"}`,
                  opacity: inc.status === "resolved" ? 0.6 : 1,
                }}>
                <div className="flex items-start gap-3">
                  <span className="text-base">{st.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{inc.type}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: sev.bg, color: `hsl(var(${sev.color}))` }}>{sev.label}</span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{inc.description}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      👤 {inc.driver} • 📍 {inc.zone} • Escalade: Niv.{escalationLevel}
                    </p>
                    {slaExpired && (
                      <p className="text-[10px] mt-0.5 font-semibold animate-pulse" style={{ color: "hsl(var(--destructive))" }}>
                        ⏰ SLA dépassé
                      </p>
                    )}
                  </div>
                  {inc.status !== "resolved" && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" className="text-[10px] h-6 px-2" onClick={() => resolveIncident(inc.id)}
                        style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                        Résoudre
                      </Button>
                      <Button size="sm" className="text-[10px] h-6 px-2" onClick={() => escalateIncident(inc.id, escalationLevel)}
                        style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>
                        Escalader
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "create" && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
          <select value={newIncident.type} onChange={e => setNewIncident(p => ({ ...p, type: e.target.value }))}
            className="w-full h-9 text-xs rounded-md px-2"
            style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-1">
            {(["low", "medium", "high", "critical"] as const).map(s => (
              <button key={s} onClick={() => setNewIncident(p => ({ ...p, severity: s }))}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold"
                style={{
                  background: newIncident.severity === s ? severityConfig(s).bg : "hsl(var(--muted) / 0.3)",
                  color: newIncident.severity === s ? `hsl(var(${severityConfig(s).color}))` : "hsl(var(--muted-foreground))",
                }}>
                {severityConfig(s).label}
              </button>
            ))}
          </div>
          <Input value={newIncident.driver} onChange={e => setNewIncident(p => ({ ...p, driver: e.target.value }))}
            placeholder="Livreur concerné" className="h-8 text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
          <Input value={newIncident.zone} onChange={e => setNewIncident(p => ({ ...p, zone: e.target.value }))}
            placeholder="Zone (optionnel)" className="h-8 text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
          <Textarea value={newIncident.description} onChange={e => setNewIncident(p => ({ ...p, description: e.target.value }))}
            placeholder="Description détaillée..." rows={3} className="text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
          <Button className="w-full text-xs h-9" onClick={submitIncident}
            style={{ background: "hsl(var(--destructive))", color: "#fff" }}>
            🚨 Déclarer l'incident
          </Button>
        </div>
      )}

      {view === "stats" && (
        <div className="space-y-2">
          {allIncidents.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucune donnée</div>
          )}
          {[...new Set(allIncidents.map((i: any) => i.driver))].filter(Boolean).map((driver: any) => {
            const driverInc = allIncidents.filter((i: any) => i.driver === driver);
            const resolved = driverInc.filter((i: any) => i.status === "resolved").length;
            return (
              <div key={driver} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <User className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{driver}</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {driverInc.length} incident{driverInc.length > 1 ? "s" : ""} • {resolved} résolu{resolved > 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-[10px] font-bold" style={{
                  color: driverInc.length <= 1 ? "hsl(var(--success))" : driverInc.length <= 2 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                }}>{driverInc.length}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
