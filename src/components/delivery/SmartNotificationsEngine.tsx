/**
 * SmartNotificationsEngine — WW. Smart Notifications Engine
 * Contextual alerts, daily digest config, granular preferences.
 * PASS89-WW
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Clock, Mail, Smartphone, MessageSquare, Settings, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotifCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

interface DigestConfig {
  enabled: boolean;
  frequency: "daily" | "weekly" | "realtime";
  time: string;
  includeMetrics: boolean;
  includeAlerts: boolean;
  includeLeaderboard: boolean;
}

interface SmartRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  emoji: string;
}

const CATEGORIES: NotifCategory[] = [
  { id: "new_job", label: "Nouvelles missions", emoji: "📩", description: "Quand une mission est disponible", push: true, email: false, sms: false, inApp: true },
  { id: "job_assigned", label: "Assignation", emoji: "✅", description: "Quand vous êtes assigné", push: true, email: true, sms: true, inApp: true },
  { id: "delivery_update", label: "Mises à jour livraison", emoji: "🚗", description: "Statut de livraison change", push: true, email: false, sms: false, inApp: true },
  { id: "payment", label: "Paiements", emoji: "💰", description: "Paiements reçus ou en attente", push: true, email: true, sms: false, inApp: true },
  { id: "rating", label: "Évaluations", emoji: "⭐", description: "Nouvelles notes et avis", push: true, email: false, sms: false, inApp: true },
  { id: "dispute", label: "Litiges", emoji: "⚠️", description: "Alertes de litiges", push: true, email: true, sms: true, inApp: true },
  { id: "fleet_alert", label: "Alertes flotte", emoji: "🚐", description: "Maintenance, documents expirés", push: true, email: true, sms: false, inApp: true },
  { id: "promo", label: "Promotions", emoji: "🎁", description: "Offres et bonus spéciaux", push: false, email: true, sms: false, inApp: true },
];

const SMART_RULES: SmartRule[] = [
  { id: "r1", name: "Alerte Haute Priorité", condition: "Mission urgente à <2km", action: "Notification push + son", enabled: true, emoji: "🔴" },
  { id: "r2", name: "Streak Reminder", condition: "Streak en danger (pas de livraison à 20h)", action: "Push + rappel", enabled: true, emoji: "🔥" },
  { id: "r3", name: "Paiement Retardé", condition: "Paiement non reçu après 48h", action: "Email + notification", enabled: true, emoji: "💸" },
  { id: "r4", name: "Document Expirant", condition: "Document expire dans 30 jours", action: "Email + push quotidien", enabled: false, emoji: "📄" },
  { id: "r5", name: "Score Drop", condition: "Note moyenne passe sous 4.0", action: "Push immédiat + conseils", enabled: true, emoji: "📉" },
  { id: "r6", name: "Zone Chaude", condition: "Forte demande dans votre zone", action: "Push avec carte", enabled: false, emoji: "🗺️" },
];

export default function SmartNotificationsEngine({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"preferences" | "digest" | "smart-rules">("preferences");
  const [categories, setCategories] = useState(CATEGORIES);
  const [rules, setRules] = useState(SMART_RULES);
  const [digest, setDigest] = useState<DigestConfig>({
    enabled: true, frequency: "daily", time: "08:00",
    includeMetrics: true, includeAlerts: true, includeLeaderboard: false,
  });

  const toggleChannel = (catId: string, channel: "push" | "email" | "sms" | "inApp") => {
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, [channel]: !c[channel] } : c));
  };

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  };

  const handleSave = () => {
    toast.success("Préférences sauvegardées !");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Notifications Intelligentes</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "preferences" as const, label: "⚙️ Préférences" },
          { id: "digest" as const, label: "📋 Digest" },
          { id: "smart-rules" as const, label: "🧠 Règles IA" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "preferences" && (
          <motion.div key="prefs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {/* Channel headers */}
            <div className="flex items-center gap-2 px-3 py-1">
              <span className="flex-1" />
              <span className="w-8 text-center text-[8px] font-bold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Push</span>
              <span className="w-8 text-center text-[8px] font-bold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Email</span>
              <span className="w-8 text-center text-[8px] font-bold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>SMS</span>
              <span className="w-8 text-center text-[8px] font-bold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>App</span>
            </div>

            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <span className="text-sm">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{cat.label}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{cat.description}</p>
                </div>
                {(["push", "email", "sms", "inApp"] as const).map(ch => (
                  <button key={ch} onClick={() => toggleChannel(cat.id, ch)}
                    className="w-8 h-6 rounded-md flex items-center justify-center transition-all"
                    style={{
                      background: cat[ch] ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-bg))",
                      border: `1px solid ${cat[ch] ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.1)"}`,
                    }}>
                    <span className="text-[9px]">{cat[ch] ? "✓" : "—"}</span>
                  </button>
                ))}
              </div>
            ))}

            <Button size="sm" className="w-full text-xs h-9 mt-2" onClick={handleSave}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Sauvegarder les préférences
            </Button>
          </motion.div>
        )}

        {tab === "digest" && (
          <motion.div key="digest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Toggle */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <Mail className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
              <div className="flex-1">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Digest Email</p>
                <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Résumé périodique de votre activité</p>
              </div>
              <button onClick={() => setDigest(d => ({ ...d, enabled: !d.enabled }))}
                className="w-10 h-5 rounded-full transition-all relative"
                style={{ background: digest.enabled ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-bg))" }}>
                <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                  style={{ left: digest.enabled ? "22px" : "2px", background: "white" }} />
              </button>
            </div>

            {digest.enabled && (
              <>
                {/* Frequency */}
                <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Fréquence</p>
                  <div className="flex gap-1">
                    {(["realtime", "daily", "weekly"] as const).map(f => (
                      <button key={f} onClick={() => setDigest(d => ({ ...d, frequency: f }))}
                        className="flex-1 py-1.5 rounded-md text-[10px] font-semibold"
                        style={{
                          background: digest.frequency === f ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-bg))",
                          color: digest.frequency === f ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
                        }}>
                        {f === "realtime" ? "⚡ Temps réel" : f === "daily" ? "📅 Quotidien" : "📆 Hebdo"}
                      </button>
                    ))}
                  </div>
                </div>

                {digest.frequency !== "realtime" && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                    <Clock className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
                    <span className="text-[11px] flex-1" style={{ color: "hsl(var(--hud-text))" }}>Heure d'envoi</span>
                    <input type="time" value={digest.time} onChange={e => setDigest(d => ({ ...d, time: e.target.value }))}
                      className="text-[11px] px-2 py-1 rounded-md" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", border: "1px solid hsl(var(--hud-border) / 0.1)" }} />
                  </div>
                )}

                {/* Content toggles */}
                <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Contenu du digest</p>
                  {[
                    { key: "includeMetrics" as const, label: "📊 Métriques de performance" },
                    { key: "includeAlerts" as const, label: "⚠️ Alertes et actions requises" },
                    { key: "includeLeaderboard" as const, label: "🏆 Position au classement" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                      <span className="text-[10px]" style={{ color: "hsl(var(--hud-text))" }}>{item.label}</span>
                      <button onClick={() => setDigest(d => ({ ...d, [item.key]: !d[item.key] }))}
                        className="w-8 h-4 rounded-full transition-all relative"
                        style={{ background: digest[item.key] ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.2)" }}>
                        <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all"
                          style={{ left: digest[item.key] ? "16px" : "1px", background: "white" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Button size="sm" className="w-full text-xs h-9" onClick={handleSave}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              Sauvegarder la configuration
            </Button>
          </motion.div>
        )}

        {tab === "smart-rules" && (
          <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-[10px] px-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Règles automatiques basées sur le contexte et le comportement.
            </p>
            {rules.map(r => (
              <div key={r.id} className="rounded-xl p-3" style={{
                background: r.enabled ? "hsl(var(--hud-surface))" : "hsl(var(--hud-surface) / 0.5)",
                border: `1px solid ${r.enabled ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-border) / 0.06)"}`,
                opacity: r.enabled ? 1 : 0.6,
              }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{r.name}</p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                      Si: {r.condition}
                    </p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>
                      → {r.action}
                    </p>
                  </div>
                  <button onClick={() => toggleRule(r.id)}
                    className="w-10 h-5 rounded-full transition-all relative shrink-0"
                    style={{ background: r.enabled ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-bg))" }}>
                    <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                      style={{ left: r.enabled ? "22px" : "2px", background: "white" }} />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
