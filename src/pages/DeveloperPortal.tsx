import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Key, Plus, Copy, Trash2, Code, BookOpen, Shield, Zap, Webhook, CheckCircle2, XCircle, Globe } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const API_ENDPOINTS = [
  { method: "GET", path: "/properties", desc: "List properties" },
  { method: "GET", path: "/tenants", desc: "List tenants" },
  { method: "GET", path: "/leases", desc: "List leases" },
  { method: "GET", path: "/rent-calls", desc: "List rent calls" },
  { method: "GET", path: "/documents", desc: "List documents" },
  { method: "POST", path: "/properties", desc: "Create a property" },
  { method: "POST", path: "/tenants", desc: "Create a tenant" },
  { method: "POST", path: "/documents/generate", desc: "Generate a PDF document" },
  { method: "GET", path: "/accounting/journal", desc: "Accounting journal" },
  { method: "GET", path: "/reservations", desc: "List seasonal reservations" },
];

const WEBHOOK_EVENTS = [
  { value: "payment.received", label: "Payment received" },
  { value: "lease.created", label: "Lease created" },
  { value: "tenant.created", label: "Tenant created" },
  { value: "intervention.created", label: "Intervention created" },
  { value: "booking.created", label: "Booking created" },
  { value: "document.generated", label: "Document generated" },
  { value: "inventory.completed", label: "Inventory completed" },
];

const DeveloperPortal = () => {
  const { user, orgId } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("Default");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["*"]);

  const { data: org } = useQuery({
    queryKey: ["org", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("org_members").select("org_id").eq("user_id", user!.id).limit(1).single();
      if (!data) return null;
      const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
      return o;
    },
    enabled: !!user,
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ["api_keys", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("api_keys" as any).select("*").eq("org_id", org!.id).order("created_at", { ascending: false });
      return (data || []) as unknown as Array<{
        id: string; name: string; key_prefix: string; scopes: string[];
        active: boolean; last_used_at: string | null; created_at: string;
      }>;
    },
    enabled: !!org,
  });

  const { data: webhooks = [] } = useQuery({
    queryKey: ["webhooks", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("webhooks" as any).select("*").eq("org_id", org!.id).order("created_at", { ascending: false });
      return (data || []) as unknown as Array<{
        id: string; url: string; secret: string; events: string[];
        active: boolean; failure_count: number; last_triggered_at: string | null; created_at: string;
      }>;
    },
    enabled: !!org,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["webhook_deliveries", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("webhook_deliveries" as any).select("*").order("delivered_at", { ascending: false }).limit(50);
      return (data || []) as unknown as Array<{
        id: string; webhook_id: string; event_type: string; response_status: number | null;
        success: boolean; delivered_at: string;
      }>;
    },
    enabled: !!org,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_api_key", {
        _org_id: org!.id, _name: keyName, _scopes: ["read", "write"],
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result.key as string;
    },
    onSuccess: (key) => { setNewKey(key); qc.invalidateQueries({ queryKey: ["api_keys"] }); toast.success("API key created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Key deleted"); qc.invalidateQueries({ queryKey: ["api_keys"] }); },
  });

  const createWebhookMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("webhooks" as any).insert({
        org_id: org!.id, user_id: user!.id, url: webhookUrl, events: webhookEvents,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Webhook created");
      setWebhookOpen(false); setWebhookUrl(""); setWebhookEvents(["*"]);
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteWebhookMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Webhook deleted"); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
  });

  const toggleWebhookMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("webhooks" as any).update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const copyKey = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  const toggleEvent = (ev: string) => {
    if (ev === "*") { setWebhookEvents(["*"]); return; }
    const without = webhookEvents.filter(e => e !== "*");
    setWebhookEvents(without.includes(ev) ? without.filter(e => e !== ev) : [...without, ev]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Developer Portal</h1>
            <p className="text-muted-foreground text-sm">REST API & Webhooks to integrate Easy-Locs</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Webhook className="h-4 w-4 mr-2" />New webhook</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create a webhook</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Destination URL</Label>
                    <Input placeholder="https://your-app.com/webhooks" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-2 block">Events</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={webhookEvents.includes("*")} onCheckedChange={() => toggleEvent("*")} />
                        <span className="text-sm">All events</span>
                      </div>
                      {WEBHOOK_EVENTS.map(ev => (
                        <div key={ev.value} className="flex items-center gap-2 ml-4">
                          <Checkbox
                            checked={webhookEvents.includes("*") || webhookEvents.includes(ev.value)}
                            disabled={webhookEvents.includes("*")}
                            onCheckedChange={() => toggleEvent(ev.value)}
                          />
                          <span className="text-sm">{ev.label}</span>
                          <Badge variant="secondary" className="text-xs font-mono">{ev.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => createWebhookMut.mutate()} disabled={createWebhookMut.isPending || !webhookUrl}>
                    {createWebhookMut.isPending ? "Creating..." : "Create webhook"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setNewKey(null); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New API key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{newKey ? "API key created!" : "Create an API key"}</DialogTitle></DialogHeader>
                {newKey ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">⚠️ Copy this key now — it won't be shown again.</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono text-foreground bg-muted px-3 py-2 rounded break-all">{newKey}</code>
                        <Button size="sm" variant="outline" onClick={() => copyKey(newKey)}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => { setCreateOpen(false); setNewKey(null); }}>Close</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input placeholder="Key name" value={keyName} onChange={e => setKeyName(e.target.value)} />
                    <Button className="w-full" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                      {createMut.isPending ? "Creating..." : "Generate key"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Key className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Active keys</span></div>
            <p className="text-2xl font-bold text-foreground">{apiKeys.filter(k => k.active).length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Webhook className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Webhooks</span></div>
            <p className="text-2xl font-bold text-foreground">{webhooks.filter(w => w.active).length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Endpoints</span></div>
            <p className="text-2xl font-bold text-foreground">{API_ENDPOINTS.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Version API</span></div>
            <p className="text-2xl font-bold text-foreground">v1.0</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="keys">
          <TabsList className="flex-wrap">
            <TabsTrigger value="keys"><Key className="h-4 w-4 mr-1" />API Keys</TabsTrigger>
            <TabsTrigger value="webhooks"><Webhook className="h-4 w-4 mr-1" />Webhooks</TabsTrigger>
            <TabsTrigger value="docs"><BookOpen className="h-4 w-4 mr-1" />Documentation</TabsTrigger>
            <TabsTrigger value="examples"><Code className="h-4 w-4 mr-1" />Exemples</TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {apiKeys.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No API keys. Create one to get started.</p>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map(k => (
                      <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{k.name}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{k.key_prefix}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={k.active ? "default" : "secondary"}>{k.active ? "Active" : "Inactive"}</Badge>
                          <span className="text-xs text-muted-foreground hidden sm:inline">{format(parseISO(k.created_at), "dd/MM/yyyy")}</span>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(k.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Configured webhooks</CardTitle></CardHeader>
              <CardContent>
                {webhooks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No webhooks. Create one to receive real-time notifications.</p>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map(w => (
                      <div key={w.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                            <code className="text-sm font-mono text-foreground truncate">{w.url}</code>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={w.active ? "default" : "secondary"}>{w.active ? "Active" : "Inactive"}</Badge>
                            <Button size="sm" variant="ghost" onClick={() => toggleWebhookMut.mutate({ id: w.id, active: !w.active })}>
                              {w.active ? "Disable" : "Enable"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => copyKey(w.secret)} title="Copier le secret">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteWebhookMut.mutate(w.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {w.events.map(ev => (
                            <Badge key={ev} variant="secondary" className="text-xs font-mono">{ev}</Badge>
                          ))}
                        </div>
                        {w.failure_count > 0 && (
                          <p className="text-xs text-destructive">⚠️ {w.failure_count} recent failure(s)</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {deliveries.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Recent deliveries</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {deliveries.slice(0, 20).map(d => (
                      <div key={d.id} className="flex items-center justify-between p-2 rounded-lg border border-border text-sm">
                        <div className="flex items-center gap-2">
                          {d.success ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          <Badge variant="secondary" className="text-xs font-mono">{d.event_type}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.response_status && <span className="text-xs text-muted-foreground">HTTP {d.response_status}</span>}
                          <span className="text-xs text-muted-foreground">{format(parseISO(d.delivered_at), "dd/MM HH:mm")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="docs" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">API REST — Endpoints disponibles</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {API_ENDPOINTS.map((ep, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30">
                      <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="font-mono text-xs w-16 justify-center shrink-0">
                        {ep.method}
                      </Badge>
                      <code className="text-sm font-mono text-foreground truncate">/api/v1{ep.path}</code>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0 hidden sm:inline">{ep.desc}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-foreground text-sm mb-2">Authentification</h4>
                  <p className="text-xs text-muted-foreground">Incluez votre clé API dans le header <code className="bg-muted px-1 py-0.5 rounded">Authorization: Bearer el_xxxxx</code></p>
                  <p className="text-xs text-muted-foreground mt-1">Base URL: <code className="bg-muted px-1 py-0.5 rounded">{`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-api/v1`}</code></p>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-foreground text-sm mb-2">Webhooks — Signature</h4>
                  <p className="text-xs text-muted-foreground">Chaque requête webhook inclut un header <code className="bg-muted px-1 py-0.5 rounded">X-Webhook-Signature</code> contenant un HMAC-SHA256 du body.</p>
                  <pre className="mt-2 bg-muted rounded p-3 text-xs font-mono text-foreground overflow-x-auto">
{`// Vérification Node.js
const crypto = require('crypto');
const sig = crypto.createHmac('sha256', webhookSecret)
  .update(rawBody).digest('hex');
if (sig !== req.headers['x-webhook-signature']) {
  return res.status(401).send('Invalid signature');
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Exemples d'intégration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-2">cURL — Lister les biens</h4>
                  <pre className="bg-muted rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto">
{`curl -X GET ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api/v1/properties \\
  -H "Authorization: Bearer el_your_api_key" \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-2">JavaScript — Créer un locataire</h4>
                  <pre className="bg-muted rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto">
{`const response = await fetch('${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api/v1/tenants', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer el_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Jean Dupont',
    email: 'jean@example.com',
    phone: '+33612345678',
    property_id: 'uuid-here',
  }),
});
const tenant = await response.json();`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-2">Python — Journal comptable</h4>
                  <pre className="bg-muted rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto">
{`import requests

response = requests.get(
    '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api/v1/accounting/journal',
    headers={'Authorization': 'Bearer el_your_api_key'}
)
transactions = response.json()`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DeveloperPortal;
