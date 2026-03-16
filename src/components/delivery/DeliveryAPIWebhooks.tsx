/**
 * DeliveryAPIWebhooks — XX. Delivery API & Webhooks Panel
 * Public delivery API docs, webhook config, auto-generated docs.
 * PASS89-XX
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code, Globe, Webhook, Copy, CheckCircle2, Key, Shield, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  example?: string;
}

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  lastTriggered?: string;
  failCount: number;
}

const ENDPOINTS: APIEndpoint[] = [
  { method: "GET", path: "/api/v1/delivery/jobs", description: "Liste des missions de livraison", auth: true, example: '{ "data": [{ "id": "...", "status": "pending", ... }], "total": 42 }' },
  { method: "POST", path: "/api/v1/delivery/jobs", description: "Créer une mission de livraison", auth: true, example: '{ "pickup_address": "...", "dropoff_address": "...", "priority": "standard" }' },
  { method: "GET", path: "/api/v1/delivery/jobs/:id", description: "Détails d'une mission", auth: true },
  { method: "PUT", path: "/api/v1/delivery/jobs/:id/status", description: "Mettre à jour le statut", auth: true, example: '{ "status": "in_progress" }' },
  { method: "GET", path: "/api/v1/delivery/drivers/nearby", description: "Chauffeurs disponibles à proximité", auth: true, example: '{ "lat": 48.8566, "lng": 2.3522, "radius_km": 10 }' },
  { method: "POST", path: "/api/v1/delivery/jobs/:id/assign", description: "Assigner un chauffeur", auth: true, example: '{ "driver_id": "..." }' },
  { method: "GET", path: "/api/v1/delivery/tracking/:code", description: "Suivi public par code", auth: false },
  { method: "GET", path: "/api/v1/delivery/analytics", description: "Métriques de performance", auth: true },
  { method: "POST", path: "/api/v1/delivery/webhooks", description: "Enregistrer un webhook", auth: true },
  { method: "DELETE", path: "/api/v1/delivery/webhooks/:id", description: "Supprimer un webhook", auth: true },
];

const WEBHOOK_EVENTS = [
  "job.created", "job.assigned", "job.accepted", "job.picked_up",
  "job.delivered", "job.cancelled", "driver.location_update",
  "payment.completed", "dispute.opened", "rating.submitted",
];

const METHOD_COLORS: Record<string, string> = {
  GET: "hsl(var(--success))", POST: "hsl(var(--info))", PUT: "hsl(var(--warning))", DELETE: "hsl(var(--destructive))",
};

export default function DeliveryAPIWebhooks({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"docs" | "webhooks" | "keys">("docs");
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    { id: "wh1", url: "https://myapp.com/webhooks/delivery", events: ["job.created", "job.delivered"], active: true, secret: "whsec_abc123...xyz", lastTriggered: "2026-03-15T14:30:00Z", failCount: 0 },
    { id: "wh2", url: "https://erp.company.com/api/delivery", events: ["payment.completed"], active: false, secret: "whsec_def456...uvw", failCount: 3 },
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const addWebhook = () => {
    if (!newWebhookUrl || selectedEvents.length === 0) {
      toast.error("URL et événements requis");
      return;
    }
    const newWh: WebhookConfig = {
      id: `wh${Date.now()}`, url: newWebhookUrl, events: selectedEvents,
      active: true, secret: `whsec_${Math.random().toString(36).slice(2, 14)}`, failCount: 0,
    };
    setWebhooks(prev => [...prev, newWh]);
    setNewWebhookUrl("");
    setSelectedEvents([]);
    toast.success("Webhook enregistré !");
  };

  const toggleEvent = (evt: string) => {
    setSelectedEvents(prev => prev.includes(evt) ? prev.filter(e => e !== evt) : [...prev, evt]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Code className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>API & Webhooks</h3>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))" }}>v1</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "docs" as const, label: "📖 Documentation" },
          { id: "webhooks" as const, label: "🔗 Webhooks" },
          { id: "keys" as const, label: "🔑 API Keys" },
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
        {tab === "docs" && (
          <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {/* Base URL */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <Globe className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
              <code className="text-[10px] flex-1 font-mono" style={{ color: "hsl(var(--hud-text))" }}>
                https://api.easy-locs.app/api/v1/delivery
              </code>
              <button onClick={() => copyToClipboard("https://api.easy-locs.app/api/v1/delivery")}>
                <Copy className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
              </button>
            </div>

            {/* Endpoints */}
            {ENDPOINTS.map(ep => {
              const key = `${ep.method}:${ep.path}`;
              const expanded = expandedEndpoint === key;
              return (
                <div key={key} className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <button onClick={() => setExpandedEndpoint(expanded ? null : key)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${METHOD_COLORS[ep.method]}15`, color: METHOD_COLORS[ep.method] }}>
                      {ep.method}
                    </span>
                    <code className="text-[10px] font-mono flex-1" style={{ color: "hsl(var(--hud-text))" }}>{ep.path}</code>
                    {ep.auth && <Key className="h-3 w-3" style={{ color: "hsl(var(--warning) / 0.5)" }} />}
                  </button>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-3 pb-3 space-y-2">
                          <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{ep.description}</p>
                          {ep.auth && (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" style={{ color: "hsl(var(--warning))" }} />
                              <span className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>Authentification requise (Bearer token)</span>
                            </div>
                          )}
                          {ep.example && (
                            <div className="rounded-lg p-2 relative" style={{ background: "hsl(var(--hud-bg))" }}>
                              <pre className="text-[9px] font-mono overflow-x-auto" style={{ color: "hsl(var(--hud-cyan))" }}>
                                {ep.example}
                              </pre>
                              <button onClick={() => copyToClipboard(ep.example!)} className="absolute top-1 right-1">
                                <Copy className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "webhooks" && (
          <motion.div key="webhooks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Existing webhooks */}
            {webhooks.map(wh => (
              <div key={wh.id} className="rounded-xl p-3 space-y-2" style={{
                background: "hsl(var(--hud-surface))",
                border: `1px solid ${wh.active ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-border) / 0.08)"}`,
                opacity: wh.active ? 1 : 0.6,
              }}>
                <div className="flex items-center gap-2">
                  <Webhook className="h-3.5 w-3.5" style={{ color: wh.active ? "hsl(var(--success))" : "hsl(var(--muted-foreground))" }} />
                  <code className="text-[10px] font-mono flex-1 truncate" style={{ color: "hsl(var(--hud-text))" }}>{wh.url}</code>
                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{
                    background: wh.active ? "hsl(var(--success) / 0.12)" : "hsl(var(--muted) / 0.2)",
                    color: wh.active ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
                  }}>
                    {wh.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {wh.events.map(e => (
                    <span key={e} className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-cyan))" }}>{e}</span>
                  ))}
                </div>
                {wh.failCount > 0 && (
                  <p className="text-[9px]" style={{ color: "hsl(var(--destructive))" }}>⚠️ {wh.failCount} échecs récents</p>
                )}
              </div>
            ))}

            {/* Add webhook */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>➕ Nouveau webhook</p>
              <Input placeholder="https://your-app.com/webhook" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)}
                className="h-8 text-xs font-mono" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <div className="flex flex-wrap gap-1">
                {WEBHOOK_EVENTS.map(evt => (
                  <button key={evt} onClick={() => toggleEvent(evt)}
                    className="text-[8px] font-mono px-1.5 py-0.5 rounded transition-all"
                    style={{
                      background: selectedEvents.includes(evt) ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-bg))",
                      color: selectedEvents.includes(evt) ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
                      border: `1px solid ${selectedEvents.includes(evt) ? "hsl(var(--hud-cyan) / 0.3)" : "transparent"}`,
                    }}>
                    {evt}
                  </button>
                ))}
              </div>
              <Button size="sm" className="w-full text-xs h-8" onClick={addWebhook}
                style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
                <Zap className="h-3 w-3 mr-1" /> Enregistrer le webhook
              </Button>
            </div>

            {/* Webhook payload example */}
            <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>📦 Exemple de payload</p>
              <div className="rounded-lg p-2" style={{ background: "hsl(var(--hud-bg))" }}>
                <pre className="text-[9px] font-mono whitespace-pre-wrap" style={{ color: "hsl(var(--hud-cyan))" }}>{`{
  "event": "job.delivered",
  "timestamp": "2026-03-16T14:30:00Z",
  "data": {
    "job_id": "abc-123",
    "status": "completed",
    "driver_id": "drv-456",
    "delivered_at": "2026-03-16T14:28:00Z",
    "confirmation_code": "847291"
  },
  "signature": "sha256=..."
}`}</pre>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "keys" && (
          <motion.div key="keys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* API Key info */}
            <div className="rounded-xl p-4 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.08), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--hud-cyan) / 0.15)" }}>
              <Key className="h-6 w-6 mx-auto mb-2" style={{ color: "hsl(var(--hud-cyan))" }} />
              <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>Clés API</p>
              <p className="text-[10px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                Gérez vos clés depuis les paramètres de l'organisation
              </p>
            </div>

            {/* Rate limits */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>📊 Limites de taux</p>
              {[
                { plan: "Free", limit: "100 req/h", color: "--muted-foreground" },
                { plan: "Pro", limit: "5 000 req/h", color: "--info" },
                { plan: "Business", limit: "50 000 req/h", color: "--warning" },
                { plan: "Enterprise", limit: "Illimité", color: "--success" },
              ].map(p => (
                <div key={p.plan} className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                  <span className="text-[10px] font-semibold" style={{ color: `hsl(var(${p.color}))` }}>{p.plan}</span>
                  <span className="text-[10px] font-mono" style={{ color: "hsl(var(--hud-text))" }}>{p.limit}</span>
                </div>
              ))}
            </div>

            {/* Auth example */}
            <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>🔐 Authentification</p>
              <div className="rounded-lg p-2" style={{ background: "hsl(var(--hud-bg))" }}>
                <pre className="text-[9px] font-mono" style={{ color: "hsl(var(--hud-cyan))" }}>{`curl -H "Authorization: Bearer el_xxxx..." \\
  -H "Content-Type: application/json" \\
  https://api.easy-locs.app/api/v1/delivery/jobs`}</pre>
              </div>
            </div>

            {/* SDKs */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>📦 SDKs disponibles</p>
              {[
                { lang: "JavaScript", pkg: "npm i @easy-locs/delivery-sdk", emoji: "🟨" },
                { lang: "Python", pkg: "pip install easylocs-delivery", emoji: "🐍" },
                { lang: "PHP", pkg: "composer require easy-locs/delivery", emoji: "🐘" },
              ].map(s => (
                <div key={s.lang} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                  <span className="text-xs">{s.emoji}</span>
                  <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{s.lang}</span>
                  <code className="text-[9px] font-mono flex-1 truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{s.pkg}</code>
                  <button onClick={() => copyToClipboard(s.pkg)}>
                    <Copy className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
