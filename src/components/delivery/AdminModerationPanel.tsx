/**
 * AdminModerationPanel — Admin moderation: account suspension, dispute escalation, driver management.
 * PASS86-KK: Admin Moderation Panel
 */
import { useState, useEffect, useCallback } from "react";
import * as modRepo from "@/repositories/moderation.repository";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, UserX, AlertTriangle, CheckCircle2, Eye, Ban, RefreshCw, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ModerationDriver {
  id: string;
  user_id: string;
  status: string;
  vehicle_type: string;
  avg_rating: number | null;
  total_completed: number | null;
  total_cancelled: number | null;
  acceptance_rate: number | null;
  name?: string;
}

interface EscalatedDispute {
  id: string;
  job_id: string;
  raised_by: string;
  raised_by_role: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string | null;
  resolution: string | null;
}

type ModerationAction = "warn" | "suspend" | "ban" | "reinstate";

export default function AdminModerationPanel({ orgId }: { orgId: string }) {
  const [drivers, setDrivers] = useState<ModerationDriver[]>([]);
  const [disputes, setDisputes] = useState<EscalatedDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"drivers" | "disputes">("drivers");
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const { drivers: driverList, disputes: disputeData } = await modRepo.fetchModerationData();

    const userIds = (driverList as ModerationDriver[]).map(d => d.user_id);
    if (userIds.length > 0) {
      const profiles = await modRepo.fetchDriverNames(userIds);
      const nameMap = new Map(profiles.map((p: any) => [p.id, p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || null]));
      (driverList as ModerationDriver[]).forEach(d => { d.name = nameMap.get(d.user_id) || undefined; });
    }

    setDrivers(driverList as ModerationDriver[]);
    setDisputes(disputeData as EscalatedDispute[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDriverAction = async (driverId: string, userId: string, action: ModerationAction) => {
    try {
      if (action === "suspend" || action === "ban") {
        await modRepo.suspendDriver(userId);
      }

      await modRepo.insertModerationAuditLog(userId, orgId, `moderation_${action}`, {
        driver_id: driverId, action, note: actionNote, timestamp: new Date().toISOString(),
      });

      await modRepo.insertModerationNotification({
        user_id: userId,
        type: `moderation.${action}`,
        title: action === "warn" ? "⚠️ Avertissement" : action === "suspend" ? "🚫 Compte suspendu" : action === "ban" ? "❌ Compte banni" : "✅ Compte réactivé",
        body: actionNote || `Action de modération : ${action}`,
        cta_url: "/driver",
        metadata_json: { actor: "rider", domain: "admin" },
      });

      toast.success(`Action "${action}" appliquée`);
      setActionNote("");
      setSelectedDriver(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const resolveDispute = async (disputeId: string) => {
    if (!resolutionNote.trim()) { toast.error("Résolution requise"); return; }
    try {
      await modRepo.resolveDispute(disputeId, resolutionNote);

      toast.success("Litige résolu");
      setResolutionNote("");
      setSelectedDispute(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const getRiskLevel = (driver: ModerationDriver): { level: string; color: string } => {
    const cancelled = driver.total_cancelled || 0;
    const rating = driver.avg_rating || 5;
    const acceptance = driver.acceptance_rate || 100;
    if (rating < 2.5 || cancelled > 10 || acceptance < 30) return { level: "Critique", color: "hsl(var(--destructive))" };
    if (rating < 3.5 || cancelled > 5 || acceptance < 50) return { level: "Élevé", color: "hsl(var(--warning))" };
    if (rating < 4.0 || acceptance < 70) return { level: "Modéré", color: "hsl(var(--info))" };
    return { level: "Faible", color: "hsl(var(--success))" };
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Shield className="h-3.5 w-3.5" style={{ color: "hsl(var(--destructive))" }} />
          Modération admin
        </h3>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchData}>
          <RefreshCw className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }} />
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--hud-surface))" }}>
        {(["drivers", "disputes"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              background: tab === t ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: tab === t ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t === "drivers" ? `👥 Chauffeurs (${drivers.length})` : `⚠️ Litiges (${disputes.filter(d => d.status !== "resolved").length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Shield className="h-5 w-5 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
        </div>
      ) : tab === "drivers" ? (
        <div className="space-y-1.5">
          {drivers.length === 0 ? (
            <p className="text-[10px] text-center py-6" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Aucun chauffeur</p>
          ) : (
            drivers.sort((a, b) => (a.avg_rating || 5) - (b.avg_rating || 5)).map(driver => {
              const risk = getRiskLevel(driver);
              const isSelected = selectedDriver === driver.id;

              return (
                <div key={driver.id} className="rounded-xl overflow-hidden"
                  style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${isSelected ? risk.color + "30" : "hsl(var(--hud-border) / 0.06)"}` }}>
                  <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    onClick={() => setSelectedDriver(isSelected ? null : driver.id)}>
                    <div className="w-2 h-8 rounded-full" style={{ background: risk.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                        {driver.name || driver.user_id.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {driver.avg_rating != null && <span className="text-[8px]" style={{ color: "hsl(var(--warning))" }}>⭐ {driver.avg_rating.toFixed(1)}</span>}
                        <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                          ✅ {driver.total_completed || 0} • ❌ {driver.total_cancelled || 0}
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: risk.color + "15", color: risk.color }}>
                      {risk.level}
                    </span>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden">
                        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                          <Textarea value={actionNote} onChange={e => setActionNote(e.target.value)}
                            placeholder="Note de modération…"
                            className="min-h-[50px] text-[10px] mt-2"
                            style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { action: "warn" as const, label: "⚠️ Avertir", color: "--warning" },
                              { action: "suspend" as const, label: "🚫 Suspendre", color: "--destructive" },
                              { action: "ban" as const, label: "❌ Bannir", color: "--destructive" },
                              { action: "reinstate" as const, label: "✅ Réactiver", color: "--success" },
                            ].map(({ action, label, color }) => (
                              <Button key={action} size="sm" className="text-[8px] h-7 px-1"
                                onClick={() => handleDriverAction(driver.id, driver.user_id, action)}
                                style={{ background: `hsl(var(${color}) / 0.1)`, color: `hsl(var(${color}))` }}>
                                {label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {disputes.length === 0 ? (
            <p className="text-[10px] text-center py-6" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Aucun litige</p>
          ) : (
            disputes.map(dispute => {
              const isOpen = dispute.status !== "resolved";
              const isSelected = selectedDispute === dispute.id;

              return (
                <div key={dispute.id} className="rounded-xl overflow-hidden"
                  style={{
                    background: "hsl(var(--hud-surface))",
                    border: `1px solid ${isOpen ? "hsl(var(--warning) / 0.15)" : "hsl(var(--hud-border) / 0.06)"}`,
                  }}>
                  <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    onClick={() => setSelectedDispute(isSelected ? null : dispute.id)}>
                    <span className="text-sm">{isOpen ? "⚠️" : "✅"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{dispute.reason}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                          Par: {dispute.raised_by_role}
                        </span>
                        <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                          {dispute.created_at ? new Date(dispute.created_at).toLocaleDateString("fr") : ""}
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        background: isOpen ? "hsl(var(--warning) / 0.1)" : "hsl(var(--success) / 0.1)",
                        color: isOpen ? "hsl(var(--warning))" : "hsl(var(--success))",
                      }}>
                      {isOpen ? "Ouvert" : "Résolu"}
                    </span>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden">
                        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                          {dispute.description && (
                            <p className="text-[9px] pt-2" style={{ color: "hsl(var(--hud-text-dim))" }}>{dispute.description}</p>
                          )}
                          {dispute.resolution && (
                            <div className="px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--success) / 0.05)" }}>
                              <p className="text-[9px]" style={{ color: "hsl(var(--success))" }}>✅ {dispute.resolution}</p>
                            </div>
                          )}
                          {isOpen && (
                            <>
                              <Textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)}
                                placeholder="Résolution du litige…"
                                className="min-h-[50px] text-[10px]"
                                style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                              <Button size="sm" className="w-full text-[10px] h-7"
                                onClick={() => resolveDispute(dispute.id)}
                                style={{ background: "hsl(var(--success))", color: "#fff" }}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Résoudre le litige
                              </Button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
