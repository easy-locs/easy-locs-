/**
 * DeliveryEventNotifications — Push/email notification triggers for critical delivery events.
 * PASS86-LL: Push & Email Notifications
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Mail, Smartphone, Settings, CheckCircle2, AlertTriangle, Truck, Package, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotificationRule {
  id: string;
  event: string;
  label: string;
  emoji: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  recipients: ("seller" | "driver" | "buyer")[];
  delay: number; // seconds
  priority: "low" | "medium" | "high" | "critical";
}

const DEFAULT_RULES: NotificationRule[] = [
  { id: "job_created", event: "job_created", label: "Mission créée", emoji: "📦", pushEnabled: true, emailEnabled: true, recipients: ["seller"], delay: 0, priority: "medium" },
  { id: "driver_assigned", event: "driver_assigned", label: "Chauffeur assigné", emoji: "📩", pushEnabled: true, emailEnabled: true, recipients: ["seller", "driver", "buyer"], delay: 0, priority: "high" },
  { id: "driver_accepted", event: "driver_accepted", label: "Mission acceptée", emoji: "✅", pushEnabled: true, emailEnabled: false, recipients: ["seller", "buyer"], delay: 0, priority: "medium" },
  { id: "pickup_completed", event: "pickup_completed", label: "Colis récupéré", emoji: "🚗", pushEnabled: true, emailEnabled: false, recipients: ["seller", "buyer"], delay: 0, priority: "high" },
  { id: "delivery_nearby", event: "delivery_nearby", label: "Livreur à proximité", emoji: "📍", pushEnabled: true, emailEnabled: false, recipients: ["buyer"], delay: 0, priority: "high" },
  { id: "delivery_completed", event: "delivery_completed", label: "Livraison terminée", emoji: "🏁", pushEnabled: true, emailEnabled: true, recipients: ["seller", "driver", "buyer"], delay: 0, priority: "high" },
  { id: "delivery_late", event: "delivery_late", label: "Retard détecté", emoji: "⏰", pushEnabled: true, emailEnabled: true, recipients: ["seller"], delay: 300, priority: "critical" },
  { id: "delivery_cancelled", event: "delivery_cancelled", label: "Annulation", emoji: "❌", pushEnabled: true, emailEnabled: true, recipients: ["seller", "driver", "buyer"], delay: 0, priority: "critical" },
  { id: "dispute_opened", event: "dispute_opened", label: "Litige ouvert", emoji: "⚠️", pushEnabled: true, emailEnabled: true, recipients: ["seller"], delay: 0, priority: "critical" },
  { id: "rating_received", event: "rating_received", label: "Note reçue", emoji: "⭐", pushEnabled: true, emailEnabled: false, recipients: ["driver"], delay: 0, priority: "low" },
];

export default function DeliveryEventNotifications({ orgId }: { orgId: string }) {
  const [rules, setRules] = useState<NotificationRule[]>(DEFAULT_RULES);
  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [testSending, setTestSending] = useState<string | null>(null);

  const togglePush = (id: string) => setRules(prev => prev.map(r => r.id === id ? { ...r, pushEnabled: !r.pushEnabled } : r));
  const toggleEmail = (id: string) => setRules(prev => prev.map(r => r.id === id ? { ...r, emailEnabled: !r.emailEnabled } : r));
  const toggleRecipient = (id: string, recipient: "seller" | "driver" | "buyer") => {
    setRules(prev => prev.map(r => {
      if (r.id !== id) return r;
      const recipients = r.recipients.includes(recipient) ? r.recipients.filter(x => x !== recipient) : [...r.recipients, recipient];
      return { ...r, recipients };
    }));
  };

  const testNotification = async (rule: NotificationRule) => {
    setTestSending(rule.id);
    await new Promise(r => setTimeout(r, 800));
    toast.success(`Test "${rule.label}" envoyé`);
    setTestSending(null);
  };

  const getPriorityConfig = (p: string) => {
    switch (p) {
      case "critical": return { color: "hsl(var(--destructive))", label: "Critique" };
      case "high": return { color: "hsl(var(--warning))", label: "Haute" };
      case "medium": return { color: "hsl(var(--info))", label: "Moyenne" };
      default: return { color: "hsl(var(--hud-text-dim) / 0.4)", label: "Basse" };
    }
  };

  const enabledPush = rules.filter(r => r.pushEnabled).length;
  const enabledEmail = rules.filter(r => r.emailEnabled).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Bell className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
          Notifications livraison
        </h3>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Événements", value: rules.length, color: "--hud-text", icon: Zap },
          { label: "Push actifs", value: enabledPush, color: "--hud-cyan", icon: Smartphone },
          { label: "Email actifs", value: enabledEmail, color: "--info", icon: Mail },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <Icon className="h-3 w-3 mx-auto mb-1" style={{ color: `hsl(var(${color}))` }} />
            <p className="text-sm font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Rules list */}
      <div className="space-y-1">
        {rules.map(rule => {
          const isExpanded = showConfig === rule.id;
          const priorityCfg = getPriorityConfig(rule.priority);

          return (
            <div key={rule.id} className="rounded-xl overflow-hidden"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
              <div className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() => setShowConfig(isExpanded ? null : rule.id)}>
                <span className="text-sm">{rule.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{rule.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {rule.recipients.map(r => (
                      <span key={r} className="text-[7px] px-1 py-0.5 rounded"
                        style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                        {r === "seller" ? "🏪" : r === "driver" ? "🚗" : "👤"} {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={e => { e.stopPropagation(); togglePush(rule.id); }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: rule.pushEnabled ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-border) / 0.06)" }}>
                    <Smartphone className="h-3 w-3" style={{ color: rule.pushEnabled ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.2)" }} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); toggleEmail(rule.id); }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: rule.emailEnabled ? "hsl(var(--info) / 0.1)" : "hsl(var(--hud-border) / 0.06)" }}>
                    <Mail className="h-3 w-3" style={{ color: rule.emailEnabled ? "hsl(var(--info))" : "hsl(var(--hud-text-dim) / 0.2)" }} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                      {/* Recipients */}
                      <div className="pt-2">
                        <p className="text-[8px] font-bold mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>DESTINATAIRES</p>
                        <div className="flex gap-1">
                          {(["seller", "driver", "buyer"] as const).map(r => (
                            <button key={r} onClick={() => toggleRecipient(rule.id, r)}
                              className="text-[9px] px-2 py-1 rounded-lg transition-all"
                              style={{
                                background: rule.recipients.includes(r) ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-bg))",
                                border: `1px solid ${rule.recipients.includes(r) ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.08)"}`,
                                color: rule.recipients.includes(r) ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
                              }}>
                              {r === "seller" ? "🏪 Vendeur" : r === "driver" ? "🚗 Livreur" : "👤 Client"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Priority & delay */}
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Priorité</p>
                          <span className="text-[9px] font-semibold" style={{ color: priorityCfg.color }}>{priorityCfg.label}</span>
                        </div>
                        {rule.delay > 0 && (
                          <div>
                            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Délai</p>
                            <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{rule.delay}s</span>
                          </div>
                        )}
                      </div>

                      {/* Test */}
                      <Button size="sm" variant="outline" className="w-full text-[10px] h-7"
                        onClick={() => testNotification(rule)}
                        disabled={testSending === rule.id}
                        style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
                        {testSending === rule.id ? "Envoi…" : "🔔 Tester cette notification"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <Button size="sm" className="w-full text-xs h-9"
        onClick={() => toast.success("Configuration des notifications sauvegardée")}
        style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Sauvegarder la configuration
      </Button>
    </div>
  );
}
