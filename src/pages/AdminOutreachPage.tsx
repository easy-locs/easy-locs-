import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOutreachMetrics, getOutreachRecords, bulkCreateOutreach, markOutreachSent, type OutreachMetrics } from "@/lib/merchant/outreach-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Send, Users, Eye, MousePointerClick, Store, Zap, Loader2, MessageSquare, Mail, Phone } from "lucide-react";

export default function AdminOutreachPage() {
  const [metrics, setMetrics] = useState<OutreachMetrics | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp");

  const loadData = async () => {
    const [m, r] = await Promise.all([getOutreachMetrics(), getOutreachRecords()]);
    setMetrics(m);
    setRecords(r);

    // Count unclaimed without outreach
    const { count } = await (supabase as any)
      .from("merchant_onboarding_profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_status", "imported_not_claimed");
    setUnclaimedCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleBulkSend = async () => {
    setSending(true);
    try {
      // Get unclaimed merchants without outreach
      const { data: unclaimed } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("id")
        .eq("onboarding_status", "imported_not_claimed")
        .limit(50);

      if (!unclaimed?.length) {
        toast.info("No unclaimed merchants to reach");
        setSending(false);
        return;
      }

      const ids = unclaimed.map((r: any) => r.id);
      const campaigns = await bulkCreateOutreach({ merchantProfileIds: ids, channel });

      // Mark as sent
      for (const c of campaigns ?? []) {
        await markOutreachSent(c.id);
      }

      toast.success(`${campaigns?.length ?? 0} outreach messages created`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const funnelSteps = metrics ? [
    { label: "Sent", value: metrics.sent, icon: Send, color: "text-blue-500" },
    { label: "Delivered", value: metrics.delivered, icon: Users, color: "text-indigo-500" },
    { label: "Opened", value: metrics.opened, icon: Eye, color: "text-purple-500" },
    { label: "Clicked", value: metrics.clicked, icon: MousePointerClick, color: "text-amber-500" },
    { label: "Claimed", value: metrics.claimed, icon: Store, color: "text-emerald-500" },
    { label: "Activated", value: metrics.activated, icon: Zap, color: "text-primary" },
  ] : [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Merchant Outreach</h1>
            <p className="text-sm text-muted-foreground">{unclaimedCount} unclaimed restaurants</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {(["whatsapp", "sms", "email"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    channel === ch ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {ch === "whatsapp" ? <MessageSquare className="h-3 w-3 inline mr-1" /> : ch === "sms" ? <Phone className="h-3 w-3 inline mr-1" /> : <Mail className="h-3 w-3 inline mr-1" />}
                  {ch.toUpperCase()}
                </button>
              ))}
            </div>
            <Button onClick={handleBulkSend} disabled={sending} size="sm">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Send Batch (50)
            </Button>
          </div>
        </div>

        {/* Funnel Metrics */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {funnelSteps.map((s) => {
            const Icon = s.icon;
            const rate = metrics!.sent > 0 ? Math.round((s.value / metrics!.sent) * 100) : 0;
            return (
              <Card key={s.label}>
                <CardContent className="pt-4 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                  <div className="text-lg font-bold text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  {metrics!.sent > 0 && s.label !== "Sent" && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">{rate}%</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Conversion Funnel Bar */}
        {metrics && metrics.sent > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Conversion Funnel</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {funnelSteps.map((s) => {
                const pct = Math.round((s.value / metrics.sent) * 100);
                return (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16">{s.label}</span>
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="text-xs font-medium text-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recent Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Outreach ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[40vh] overflow-auto">
              {records.slice(0, 50).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border border-border rounded-lg p-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {r.merchant_onboarding_profiles?.merchant_name ?? "Unknown"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.channel} • {r.merchant_onboarding_profiles?.area ?? ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "activated" ? "default" : r.status === "claimed" ? "secondary" : "outline"} className="text-[10px]">
                      {r.status}
                    </Badge>
                    {r.activation_link && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={r.activation_link} target="_blank" rel="noopener"><Send className="h-3 w-3" /></a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {records.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No outreach campaigns yet. Send your first batch above.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
