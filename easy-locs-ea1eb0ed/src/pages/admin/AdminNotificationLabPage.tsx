import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  languages: string[];
  subject: string;
  preview: string;
}

interface DeliveryMetric {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  rate: number;
}

async function loadTemplateRegistry(): Promise<EmailTemplate[]> {
  try {
    const resp = await fetch("/notification-templates.json");
    if (!resp.ok) return [];
    const data = await resp.json() as Array<{ id: string; name: string; category: string; languages: string[]; subject: string }>;
    return data.map((t) => ({
      ...t,
      preview: `<h1>${t.name}</h1><p>Template: ${t.id}</p>`,
    }));
  } catch {
    return [];
  }
}

interface NotificationLogRow {
  id: string;
  channel: string;
  status: string;
  created_at: string;
}

async function loadNotificationStats(): Promise<DeliveryMetric[]> {
  try {
    const { data } = await db
      .from("notification_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!data || (data as unknown as NotificationLogRow[]).length === 0) return [];

    const rows = data as unknown as NotificationLogRow[];
    const channelMap = new Map<string, { sent: number; delivered: number; failed: number; bounced: number }>();

    for (const row of rows) {
      const ch = row.channel || "Email";
      if (!channelMap.has(ch)) channelMap.set(ch, { sent: 0, delivered: 0, failed: 0, bounced: 0 });
      const stats = channelMap.get(ch)!;
      stats.sent++;
      if (row.status === "delivered") stats.delivered++;
      else if (row.status === "failed") stats.failed++;
      else if (row.status === "bounced") stats.bounced++;
      else stats.delivered++;
    }

    return Array.from(channelMap.entries()).map(([channel, stats]) => ({
      channel,
      ...stats,
      rate: stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 1000) / 10 : 0,
    }));
  } catch {
    return [];
  }
}

export default function AdminNotificationLabPage() {
  useUiEngine("admin-notification-lab");
  const navigate = useNavigate();
  const [tab, setTab] = useState<"templates" | "analytics">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedLang, setSelectedLang] = useState("en");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [deliveryMetrics, setDeliveryMetrics] = useState<DeliveryMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    setTemplatesLoading(true);
    loadTemplateRegistry().then((tpls) => {
      setTemplates(tpls);
      setTemplatesLoading(false);
    });
  }, []);

  const refreshMetrics = useCallback(async () => {
    setMetricsLoading(true);
    const stats = await loadNotificationStats();
    setDeliveryMetrics(stats);
    setMetricsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "analytics") refreshMetrics();
  }, [tab, refreshMetrics]);

  const handleSendTest = async () => {
    if (!selectedTemplate) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const { data: { user } } = await db.auth.getUser();
      const adminEmail = user?.email;
      if (!adminEmail) {
        setTestResult("No authenticated user email found");
        setSendingTest(false);
        return;
      }
      const { error } = await db.functions.invoke("send-notification-email", {
        body: {
          event_type: selectedTemplate.id,
          locale: selectedLang,
          to: adminEmail,
          test_mode: true,
        },
      });
      setTestResult(error ? `Failed: ${error.message}` : `Test sent to ${adminEmail}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setTestResult(`Edge Function unavailable: ${errMsg}`);
    } finally {
      setSendingTest(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/lab-hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">Notification Lab</h1>
            <p className="text-xs text-muted-foreground">Template preview, delivery analytics</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(["templates", "analytics"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t === "templates" ? "Template Preview" : "Delivery Analytics"}
            </button>
          ))}
        </div>

        {tab === "templates" && !selectedTemplate && (
          <div className="space-y-2">
            {templatesLoading && (
              <div className="text-center text-sm text-muted-foreground py-4">Loading templates from registry...</div>
            )}
            {!templatesLoading && templates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No template registry found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run <code className="bg-muted px-1 rounded">npm run api:docs</code> to extract templates from the send-notification-email Edge Function registry.
                </p>
              </div>
            )}
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setSelectedLang(t.languages[0]); }}
                className="w-full rounded-xl bg-card border border-border/20 p-3 text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.category}</div>
                  </div>
                  <div className="flex gap-1">
                    {t.languages.map((l) => (
                      <span key={l} className="text-xs bg-muted px-1.5 py-0.5 rounded uppercase">{l}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "templates" && selectedTemplate && (
          <div className="space-y-3">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to templates
            </button>

            <div className="rounded-xl bg-card border border-border/20 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold">{selectedTemplate.name}</h3>
                <div className="flex gap-1">
                  {selectedTemplate.languages.map((l) => (
                    <button
                      key={l}
                      onClick={() => setSelectedLang(l)}
                      className={`text-xs px-2 py-0.5 rounded ${
                        selectedLang === l ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <strong>Subject:</strong> {selectedTemplate.subject}
              </div>

              <div className="rounded-lg bg-background border border-border/20 p-4">
                <h4 className="text-xs font-bold text-muted-foreground mb-2">HTML Preview</h4>
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.preview }}
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <h4 className="text-xs font-bold text-muted-foreground mb-2">Raw Source</h4>
                <pre className="text-xs text-muted-foreground overflow-x-auto">{selectedTemplate.preview}</pre>
              </div>

              <button
                onClick={handleSendTest}
                disabled={sendingTest}
                className="w-full rounded-xl bg-primary text-primary-foreground py-2 text-sm font-bold disabled:opacity-50"
              >
                {sendingTest ? "Sending..." : testResult ? testResult : "Send Test Email"}
              </button>
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="space-y-3">
            {metricsLoading && (
              <div className="text-center text-sm text-muted-foreground py-4">Loading delivery analytics...</div>
            )}
            {!metricsLoading && deliveryMetrics.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No delivery data yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Delivery metrics are populated from the notification_log table as notifications are sent through the system.
                </p>
              </div>
            )}
            {deliveryMetrics.map((m) => (
              <div key={m.channel} className="rounded-xl bg-card border border-border/20 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">{m.channel}</span>
                  <span className={`text-sm font-bold ${m.rate >= 98 ? "text-green-400" : m.rate >= 95 ? "text-yellow-400" : "text-red-400"}`}>
                    {m.rate}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${m.rate}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Sent</span><div>{m.sent.toLocaleString()}</div></div>
                  <div><span className="text-muted-foreground">Delivered</span><div className="text-green-400">{m.delivered.toLocaleString()}</div></div>
                  <div><span className="text-muted-foreground">Failed</span><div className="text-red-400">{m.failed}</div></div>
                  <div><span className="text-muted-foreground">Bounced</span><div className="text-yellow-400">{m.bounced}</div></div>
                </div>
              </div>
            ))}

            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-3">Template Coverage</h3>
              <div className="space-y-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="text-foreground">{t.languages.length} languages</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
