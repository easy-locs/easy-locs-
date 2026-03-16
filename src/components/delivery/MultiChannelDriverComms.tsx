/**
 * MultiChannelDriverComms — HHH. Multi-channel driver communication system.
 * Push, SMS, email, voice alerts, automatic escalation.
 * PASS98-HHH
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, Mail, MessageSquare, Phone, Volume2,
  CheckCircle2, Clock, AlertTriangle, Settings,
  Send, Filter, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface CommChannel {
  id: string;
  name: string;
  icon: typeof Bell;
  enabled: boolean;
  description: string;
  color: string;
}

interface CommMessage {
  id: string;
  channel: "push" | "sms" | "email" | "voice";
  recipient: string;
  subject: string;
  status: "sent" | "delivered" | "failed" | "escalated";
  sentAt: Date;
  deliveredAt?: Date;
  escalatedVia?: string;
}

interface EscalationRule {
  id: string;
  trigger: string;
  delay: string;
  channels: string[];
  active: boolean;
}

const CHANNELS: CommChannel[] = [
  { id: "push", name: "Push", icon: Bell, enabled: true, description: "Notification instantanée", color: "--primary" },
  { id: "sms", name: "SMS", icon: MessageSquare, enabled: true, description: "Message texte direct", color: "--success" },
  { id: "email", name: "Email", icon: Mail, enabled: true, description: "Email détaillé", color: "--info" },
  { id: "voice", name: "Vocal", icon: Phone, enabled: false, description: "Appel vocal automatique", color: "--warning" },
];

const MOCK_MESSAGES: CommMessage[] = [
  { id: "cm1", channel: "push", recipient: "Mamadou K.", subject: "Nouvelle mission assignée", status: "delivered", sentAt: new Date(Date.now() - 120000), deliveredAt: new Date(Date.now() - 118000) },
  { id: "cm2", channel: "sms", recipient: "Fatou D.", subject: "Rappel : mission dans 30 min", status: "delivered", sentAt: new Date(Date.now() - 300000), deliveredAt: new Date(Date.now() - 295000) },
  { id: "cm3", channel: "push", recipient: "Ibrahima S.", subject: "Mission urgente disponible", status: "failed", sentAt: new Date(Date.now() - 600000), escalatedVia: "SMS" },
  { id: "cm4", channel: "email", recipient: "Aïcha M.", subject: "Rapport hebdomadaire", status: "sent", sentAt: new Date(Date.now() - 900000) },
  { id: "cm5", channel: "voice", recipient: "Ibrahima S.", subject: "Escalade : mission non acceptée", status: "escalated", sentAt: new Date(Date.now() - 500000), escalatedVia: "Appel vocal" },
];

const ESCALATION_RULES: EscalationRule[] = [
  { id: "e1", trigger: "Mission non acceptée", delay: "5 min", channels: ["Push → SMS → Appel"], active: true },
  { id: "e2", trigger: "Livreur hors ligne en mission", delay: "3 min", channels: ["SMS → Appel → Admin"], active: true },
  { id: "e3", trigger: "SLA critique", delay: "Immédiat", channels: ["Push + SMS + Admin"], active: true },
  { id: "e4", trigger: "Nouvelle mission zone vide", delay: "2 min", channels: ["Push broadcast → SMS ciblé"], active: false },
];

export default function MultiChannelDriverComms({ orgId, className }: { orgId: string; className?: string }) {
  const [messages] = useState<CommMessage[]>(MOCK_MESSAGES);
  const [channels, setChannels] = useState<CommChannel[]>(CHANNELS);
  const [rules] = useState<EscalationRule[]>(ESCALATION_RULES);
  const [view, setView] = useState<"messages" | "channels" | "escalation" | "compose">("messages");
  const [composeData, setComposeData] = useState({ recipient: "", subject: "", body: "", channel: "push" });
  const [sending, setSending] = useState(false);

  const totalSent = messages.length;
  const delivered = messages.filter(m => m.status === "delivered").length;
  const failed = messages.filter(m => m.status === "failed").length;
  const escalated = messages.filter(m => m.status === "escalated").length;

  const toggleChannel = (id: string) => {
    haptic("selection");
    setChannels(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const sendMessage = async () => {
    if (!composeData.recipient || !composeData.subject) { toast.error("Remplissez tous les champs"); return; }
    setSending(true);
    haptic("medium");
    await new Promise(r => setTimeout(r, 1500));
    setSending(false);
    toast.success(`✅ Message envoyé via ${composeData.channel}`);
    setComposeData({ recipient: "", subject: "", body: "", channel: "push" });
    setView("messages");
  };

  const statusColor = (s: string) =>
    s === "delivered" ? "hsl(var(--success))" : s === "sent" ? "hsl(var(--info))" :
    s === "failed" ? "hsl(var(--destructive))" : "hsl(var(--warning))";

  const channelIcon = (ch: string) =>
    ch === "push" ? "🔔" : ch === "sms" ? "💬" : ch === "email" ? "📧" : "📞";

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Volume2 className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Communication multi-canal
        </h3>
        <Button size="sm" className="text-[9px] h-7" onClick={() => { setView("compose"); haptic("light"); }}
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          <Send className="h-3 w-3 mr-1" /> Envoyer
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Envoyés", value: totalSent, color: "--primary" },
          { label: "Livrés", value: delivered, color: "--success" },
          { label: "Échecs", value: failed, color: "--destructive" },
          { label: "Escaladés", value: escalated, color: "--warning" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["messages", "channels", "escalation", "compose"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "messages" ? "📨 Messages" : v === "channels" ? "📡 Canaux" : v === "escalation" ? "⬆️ Escalade" : "✍️ Composer"}
          </button>
        ))}
      </div>

      {/* Messages */}
      {view === "messages" && (
        <div className="space-y-2">
          {messages.map(m => (
            <div key={m.id} className="rounded-xl p-3 flex items-start gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <span className="text-base mt-0.5">{channelIcon(m.channel)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{m.subject}</p>
                <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  → {m.recipient} • {m.sentAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {m.escalatedVia && (
                  <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--warning))" }}>
                    ⬆️ Escaladé via {m.escalatedVia}
                  </p>
                )}
              </div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: statusColor(m.status) + "15", color: statusColor(m.status) }}>
                {m.status === "delivered" ? "✓ Livré" : m.status === "sent" ? "Envoyé" : m.status === "failed" ? "Échec" : "Escaladé"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Channels Config */}
      {view === "channels" && (
        <div className="space-y-2">
          {channels.map(ch => {
            const Icon = ch.icon;
            return (
              <div key={ch.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: ch.enabled ? `hsl(var(${ch.color}) / 0.1)` : "hsl(var(--muted) / 0.3)" }}>
                  <Icon className="h-4 w-4" style={{ color: ch.enabled ? `hsl(var(${ch.color}))` : "hsl(var(--muted-foreground))" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{ch.name}</p>
                  <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{ch.description}</p>
                </div>
                <button onClick={() => toggleChannel(ch.id)}
                  className="w-10 h-5 rounded-full transition-all relative"
                  style={{ background: ch.enabled ? `hsl(var(${ch.color}))` : "hsl(var(--muted) / 0.5)" }}>
                  <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
                    animate={{ left: ch.enabled ? 22 : 2 }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Escalation Rules */}
      {view === "escalation" && (
        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.id} className="rounded-xl p-3"
              style={{
                background: r.active ? "hsl(var(--muted) / 0.2)" : "hsl(var(--muted) / 0.1)",
                border: "1px solid hsl(var(--border) / 0.08)",
                opacity: r.active ? 1 : 0.5,
              }}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{r.trigger}</p>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: r.active ? "hsl(var(--success) / 0.1)" : "hsl(var(--muted) / 0.3)",
                    color: r.active ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
                  }}>
                  {r.active ? "Actif" : "Inactif"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Clock className="h-3 w-3" style={{ color: "hsl(var(--warning))" }} />
                <span className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>Délai : {r.delay}</span>
              </div>
              <p className="text-[9px] mt-1" style={{ color: "hsl(var(--info))" }}>
                {r.channels.join(" • ")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Compose */}
      {view === "compose" && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
          <div className="flex gap-1.5">
            {CHANNELS.map(ch => (
              <button key={ch.id} onClick={() => setComposeData(p => ({ ...p, channel: ch.id }))}
                className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
                style={{
                  background: composeData.channel === ch.id ? `hsl(var(${ch.color}) / 0.1)` : "hsl(var(--muted) / 0.3)",
                  color: composeData.channel === ch.id ? `hsl(var(${ch.color}))` : "hsl(var(--muted-foreground))",
                  border: `1px solid ${composeData.channel === ch.id ? `hsl(var(${ch.color}) / 0.2)` : "transparent"}`,
                }}>
                {channelIcon(ch.id)} {ch.name}
              </button>
            ))}
          </div>

          <Input value={composeData.recipient} onChange={e => setComposeData(p => ({ ...p, recipient: e.target.value }))}
            placeholder="Destinataire (nom ou ID)" className="h-8 text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />

          <Input value={composeData.subject} onChange={e => setComposeData(p => ({ ...p, subject: e.target.value }))}
            placeholder="Objet" className="h-8 text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />

          <Textarea value={composeData.body} onChange={e => setComposeData(p => ({ ...p, body: e.target.value }))}
            placeholder="Message…" rows={3} className="text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />

          <Button className="w-full text-xs h-9" disabled={sending} onClick={sendMessage}
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Envoyer</>}
          </Button>
        </div>
      )}
    </div>
  );
}
