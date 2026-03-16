/**
 * RecurringSubscriptions — Subscription plans, recurring orders, management
 * Seller: create plans, view subscribers
 * Buyer: subscribe, manage, view billing history
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Package, Plus, Loader2, Calendar, CreditCard, Pause, Play, XCircle, Users } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

const INTERVAL_LABELS: Record<string, string> = {
  weekly: "Week", biweekly: "2 Weeks", monthly: "Month", quarterly: "Quarter", yearly: "Year",
};

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-info/20 text-info",
  active: "bg-success/20 text-success",
  paused: "bg-warning/20 text-warning",
  cancelled: "bg-destructive/20 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

export default function RecurringSubscriptions({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Load plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["sub-plans-v2", shopId],
    queryFn: async () => {
      const query = (supabase as any).from("storefront_subscription_plans")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (mode === "buyer") query.eq("active", true);
      const { data } = await query;
      return data || [];
    },
  });

  // Load user subscriptions (buyer)
  const { data: mySubs = [] } = useQuery({
    queryKey: ["my-subs-v2", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_subscriptions_v2")
        .select("*, storefront_subscription_plans(name, price, currency, billing_interval)")
        .eq("shop_id", shopId).eq("subscriber_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: mode === "buyer" && !!user,
  });

  // Load all subscribers (seller)
  const { data: allSubs = [] } = useQuery({
    queryKey: ["all-subs-v2", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_subscriptions_v2")
        .select("*, storefront_subscription_plans(name, price, currency, billing_interval)")
        .eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: mode === "seller",
  });

  // Create plan (seller)
  const [planForm, setPlanForm] = useState({ name: "", description: "", price: "", currency: "EUR", interval: "monthly", trialDays: 0 });
  const createPlan = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_subscription_plans").insert({
        shop_id: shopId, user_id: user!.id,
        name: planForm.name, description: planForm.description || null,
        price: parseFloat(planForm.price), currency: planForm.currency,
        billing_interval: planForm.interval, trial_days: planForm.trialDays,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-plans-v2"] });
      setPlanForm({ name: "", description: "", price: "", currency: "EUR", interval: "monthly", trialDays: 0 });
      toast.success("Plan created");
    },
  });

  // Subscribe (buyer)
  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const plan = plans.find((p: any) => p.id === planId);
      if (!plan) throw new Error("Plan not found");
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.billing_interval === "weekly") periodEnd.setDate(periodEnd.getDate() + 7);
      else if (plan.billing_interval === "biweekly") periodEnd.setDate(periodEnd.getDate() + 14);
      else if (plan.billing_interval === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
      else if (plan.billing_interval === "quarterly") periodEnd.setMonth(periodEnd.getMonth() + 3);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      await (supabase as any).from("storefront_subscriptions_v2").insert({
        plan_id: planId, shop_id: shopId, subscriber_id: user!.id,
        status: plan.trial_days > 0 ? "trial" : "active",
        current_period_end: periodEnd.toISOString(),
        next_billing_at: periodEnd.toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subs-v2"] });
      toast.success("Subscribed!");
    },
  });

  // Manage subscription (buyer)
  const manageSubMutation = useMutation({
    mutationFn: async ({ subId, action }: { subId: string; action: "pause" | "resume" | "cancel" }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (action === "pause") { updates.status = "paused"; updates.pause_until = new Date(Date.now() + 30 * 86400000).toISOString(); }
      if (action === "resume") { updates.status = "active"; updates.pause_until = null; }
      if (action === "cancel") { updates.status = "cancelled"; updates.cancelled_at = new Date().toISOString(); }
      await (supabase as any).from("storefront_subscriptions_v2").update(updates).eq("id", subId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-subs-v2"] }); toast.success("Updated"); },
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  // ═══════ SELLER ═══════
  if (mode === "seller") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" /> Subscription Plans
        </h3>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">Create Plan</h4>
            <Input placeholder="Plan name (e.g. Monthly Box)" value={planForm.name}
              onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} className="text-xs" />
            <Textarea placeholder="Description" value={planForm.description}
              onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} rows={2} className="text-xs" />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Price" value={planForm.price}
                onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))} className="text-xs h-8" />
              <Select value={planForm.currency} onValueChange={v => setPlanForm(p => ({ ...p, currency: v }))}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["EUR", "USD", "GBP", "MAD", "XOF"].map(c => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={planForm.interval} onValueChange={v => setPlanForm(p => ({ ...p, interval: v }))}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INTERVAL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="w-full" onClick={() => createPlan.mutate()}
              disabled={!planForm.name.trim() || !planForm.price || createPlan.isPending}>
              <Plus className="h-3 w-3 mr-1" /> Create Plan
            </Button>
          </CardContent>
        </Card>

        {/* Plans list */}
        {plans.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtPrice(p.price, p.currency)} / {INTERVAL_LABELS[p.billing_interval] || p.billing_interval}</p>
                </div>
                <Badge variant={p.active ? "default" : "secondary"} className="text-[8px]">{p.active ? "Active" : "Inactive"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Subscribers overview */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Subscribers ({allSubs.length})
            </h4>
            {allSubs.slice(0, 10).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{s.subscriber_id?.slice(0, 8)}... — {s.storefront_subscription_plans?.name}</span>
                <Badge className={`text-[8px] ${STATUS_COLORS[s.status] || ""}`}>{s.status}</Badge>
              </div>
            ))}
            {allSubs.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">No subscribers yet</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════ BUYER ═══════
  const subscribedPlanIds = mySubs.filter((s: any) => s.status !== "cancelled").map((s: any) => s.plan_id);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-primary" /> Subscriptions
      </h3>

      {/* My active subscriptions */}
      {mySubs.filter((s: any) => s.status !== "cancelled").length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">My Subscriptions</h4>
          {mySubs.filter((s: any) => s.status !== "cancelled").map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold">{s.storefront_subscription_plans?.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmtPrice(s.storefront_subscription_plans?.price || 0, s.storefront_subscription_plans?.currency)} / {INTERVAL_LABELS[s.storefront_subscription_plans?.billing_interval] || "month"}
                    </p>
                    {s.next_billing_at && (
                      <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                        <Calendar className="h-2.5 w-2.5" /> Next: {new Date(s.next_billing_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`text-[8px] ${STATUS_COLORS[s.status] || ""}`}>{s.status}</Badge>
                    <div className="flex gap-1">
                      {s.status === "active" && (
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px]"
                          onClick={() => manageSubMutation.mutate({ subId: s.id, action: "pause" })}>
                          <Pause className="h-2.5 w-2.5 mr-0.5" /> Pause
                        </Button>
                      )}
                      {s.status === "paused" && (
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px]"
                          onClick={() => manageSubMutation.mutate({ subId: s.id, action: "resume" })}>
                          <Play className="h-2.5 w-2.5 mr-0.5" /> Resume
                        </Button>
                      )}
                      {s.status !== "cancelled" && (
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] text-destructive"
                          onClick={() => manageSubMutation.mutate({ subId: s.id, action: "cancel" })}>
                          <XCircle className="h-2.5 w-2.5 mr-0.5" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Available plans */}
      {plans.filter((p: any) => !subscribedPlanIds.includes(p.id)).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Available Plans</h4>
          {plans.filter((p: any) => !subscribedPlanIds.includes(p.id)).map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmtPrice(p.price, p.currency)} / {INTERVAL_LABELS[p.billing_interval] || p.billing_interval}
                      {p.trial_days > 0 && ` • ${p.trial_days} day trial`}
                    </p>
                    {p.description && <p className="text-[10px] text-muted-foreground mt-0.5">{p.description}</p>}
                  </div>
                  <Button size="sm" className="text-xs h-7" onClick={() => subscribeMutation.mutate(p.id)}
                    disabled={subscribeMutation.isPending}>
                    <CreditCard className="h-3 w-3 mr-1" /> Subscribe
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {plans.length === 0 && mySubs.length === 0 && (
        <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No subscription plans available</CardContent></Card>
      )}
    </div>
  );
}
