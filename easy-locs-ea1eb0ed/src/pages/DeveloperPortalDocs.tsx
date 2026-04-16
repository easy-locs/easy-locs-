import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  auth: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
  responseExample: Record<string, unknown>;
}

interface OpenAPIParameter {
  name: string;
  schema?: { type?: string };
  required?: boolean;
}

interface OpenAPIOperation {
  summary?: string;
  security?: Array<Record<string, unknown>>;
  parameters?: OpenAPIParameter[];
  responses?: Record<string, { content?: { "application/json"?: { example?: Record<string, unknown> } } }>;
}

interface OpenAPISpec {
  paths?: Record<string, Record<string, OpenAPIOperation>>;
}

interface WebhookEvent {
  event: string;
  description: string;
  path: string;
  payloadExample?: Record<string, unknown>;
}

export default function DeveloperPortalDocs() {
  useUiEngine("developer-portal-docs");
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [tab, setTab] = useState<"endpoints" | "webhooks" | "sdk">("endpoints");
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api-spec.json")
      .then((r) => r.json())
      .then((spec: OpenAPISpec) => {
        const eps: ApiEndpoint[] = [];
        const paths = spec.paths || {};
        for (const [pathStr, methods] of Object.entries(paths)) {
          for (const [method, def] of Object.entries(methods)) {
            eps.push({
              path: pathStr,
              method: method.toUpperCase(),
              description: def.summary || pathStr,
              auth: def.security && def.security.length > 0 ? "Bearer token" : "None",
              parameters: (def.parameters || []).map((p) => ({
                name: p.name,
                type: p.schema?.type || "string",
                required: p.required || false,
              })),
              responseExample: def.responses?.["200"]?.content?.["application/json"]?.example || { success: true },
            });
          }
        }
        setEndpoints(eps);
      })
      .catch(() => {
        setEndpoints([]);
      });

    fetch("/webhook-events.json")
      .then((r) => r.json())
      .then((events: WebhookEvent[]) => setWebhookEvents(events))
      .catch(() => setWebhookEvents([]));
  }, []);

  const METHOD_COLORS: Record<string, string> = {
    GET: "bg-green-500/10 text-green-400",
    POST: "bg-blue-500/10 text-blue-400",
    PUT: "bg-yellow-500/10 text-yellow-400",
    DELETE: "bg-red-500/10 text-red-400",
    PATCH: "bg-orange-500/10 text-orange-400",
  };

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/developer-portal")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">API Documentation</h1>
            <p className="text-xs text-muted-foreground">Auto-generated from Edge Function schemas</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(["endpoints", "webhooks", "sdk"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t === "endpoints" ? `Endpoints (${endpoints.length})` : t === "webhooks" ? "Webhooks" : "SDK"}
            </button>
          ))}
        </div>

        {tab === "endpoints" && (
          <div className="space-y-2">
            {endpoints.map((ep) => {
              const key = `${ep.method}:${ep.path}`;
              const isExpanded = expandedEndpoint === key;
              return (
                <div key={key} className="rounded-xl bg-card border border-border/20 overflow-hidden">
                  <button
                    onClick={() => setExpandedEndpoint(isExpanded ? null : key)}
                    className="w-full p-3 flex items-center gap-3 text-left"
                  >
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${METHOD_COLORS[ep.method] || "bg-muted"}`}>
                      {ep.method}
                    </span>
                    <span className="text-xs font-mono flex-1">{ep.path}</span>
                    <span className="text-xs text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/10 pt-2 space-y-2">
                      <div className="text-xs text-muted-foreground">{ep.description}</div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Auth:</span> {ep.auth}
                      </div>
                      {ep.parameters.length > 0 && (
                        <div>
                          <div className="text-xs font-bold mb-1">Parameters</div>
                          {ep.parameters.map((p) => (
                            <div key={p.name} className="text-xs text-muted-foreground pl-2">
                              {p.name} ({p.type}){p.required ? " *" : ""}
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold mb-1">Response</div>
                        <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                          {JSON.stringify(ep.responseExample, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {endpoints.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Run <code className="bg-muted px-1 rounded">npx tsx scripts/api-doc-generator.ts</code> to generate API docs
              </div>
            )}
          </div>
        )}

        {tab === "webhooks" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-2">Webhook Event Catalog</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Auto-generated from Edge Function endpoints. All webhook events are delivered as POST requests with JSON payloads.
              </p>
            </div>
            {webhookEvents.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Run <code className="bg-muted px-1 rounded">npm run api:docs</code> to generate webhook catalog from Edge Functions.
              </div>
            )}
            {webhookEvents.map((we) => (
              <div key={we.event} className="rounded-xl bg-card border border-border/20 p-4 space-y-2">
                <div className="text-sm font-bold font-mono">{we.event}</div>
                <div className="text-xs text-muted-foreground">{we.description}</div>
                <div className="text-xs text-muted-foreground font-mono">{we.path}</div>
                {we.payloadExample && (
                  <div>
                    <div className="text-xs font-bold mb-1">Payload Example</div>
                    <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                      {JSON.stringify(we.payloadExample, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "sdk" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-2">TypeScript SDK</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Auto-generated typed client library from the OpenAPI spec.
              </p>
              <div className="text-xs text-muted-foreground mb-2">Generate with:</div>
              <pre className="text-xs bg-muted/50 rounded p-2 font-mono">npx tsx scripts/sdk-generator.ts</pre>
            </div>

            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-2">Usage Example</h3>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto font-mono">{`import { EasyLocsSDK } from "./generated-sdk";

const sdk = new EasyLocsSDK(
  "https://api.easy-locs.com",
  "your-api-token"
);

const result = await sdk.postSendNotificationEmail({
  to: "user@example.com",
  template: "welcome",
  locale: "en"
});`}</pre>
            </div>

            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-2">Available Methods</h3>
              <div className="space-y-1">
                {endpoints.slice(0, 10).map((ep) => (
                  <div key={`${ep.method}:${ep.path}`} className="text-xs font-mono text-muted-foreground">
                    sdk.{ep.method.toLowerCase()}{ep.path.split("/").pop()?.replace(/-/g, "")}()
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
