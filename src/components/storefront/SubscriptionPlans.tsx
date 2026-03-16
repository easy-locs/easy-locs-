/**
 * SubscriptionPlans — ORBIT V1: Recurring subscription management.
 * Seller: create plans, view subscribers, manage billing cycles.
 * Buyer: browse plans, subscribe, manage subscription.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Plus, Crown, Users, Calendar, Loader2, CheckCircle2, XCircle, Pause } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; mode?: "seller" | "buyer"; }

const INTERVALS = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Yearly" },
];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function SubscriptionPlans({ shopId, mode = "seller" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", currency: "EUR", interval: "month", trial_days: "0", features: "" });
  const [saving, setSaving] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["sub-plans-v2", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_subscription_plans")
        .select("*").eq("shop_id", shopId).eq("active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["sub-subs-v2", shopId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const q = (supabase as any).from("storefront_subscriptions").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q.eq("subscriber_id", user.id);
      const { data } = await q.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createPlan = async () => {
    if (!user || !form.name || !form.price) return;
    setSaving(true);
    try {
      await (supabase as any).from("storefront_subscription_plans").insert({
        shop_id: shopId, user_id: user.id, name: form.name, description: form.description || null,
        price: parseFloat(form.price), currency: form.currency, interval: form.interval,
        trial_days: parseInt(form.trial_days) || 0,
        features: form.features ? form.features.split("\n").filter(Boolean) : [],
      });
      qc.invalidateQueries({ queryKey: ["sub-plans-v2", shopId] });
      setForm({ name: "", description: "", price: "", currency: "EUR", interval: "month", trial_days: "0", features: "" });
      setCreating(false);
      toast.success("Plan created");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const subscribe = async (planId: string, trialDays: number) => {
    if (!user) return;
    const now = new Date();
    const periodEnd = new Date(now);
    const plan = plans.find((p: any) => p.id === planId);
    if (!plan) return;

    if (plan.interval === "week") periodEnd.setDate(periodEnd.getDate() + 7);
    else if (plan.interval === "month") periodEnd.setMonth(periodEnd.getMonth() + 1);
    else if (plan.interval === "quarter") periodEnd.setMonth(periodEnd.getMonth() + 3);
    else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000) : null;

    await (supabase as any).from("storefront_subscriptions").insert({
      plan_id: planId, shop_id: shopId, subscriber_id: user.id,
      current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
      trial_end: trialEnd?.toISOString() || null,
    });
    qc.invalidateQueries({ queryKey: ["sub-subs-v2", shopId, user?.id] });
    toast.success("Subscribed!");
  };

  const cancelSub = async (subId: string) => {
    await (supabase as any).from("storefront_subscriptions").update({
      cancel_at_period_end: true, cancelled_at: new Date().toISOString(),
    }).eq("id", subId);
    qc.invalidateQueries({ queryKey: ["sub-subs-v2", shopId, user?.id] });
    toast.success("Subscription will cancel at period end");
  };

  const activeSubs = subscriptions.filter((s: any) => s.status === "active");
  const myPlanIds = new Set(activeSubs.map((s: any) => s.plan_id));

  if (mode === "buyer") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" /> Subscription Plans
        </h3>

        {plans.length === 0 && (
          <p className="text-xs text-muted-foreground">No subscription plans available.</p>
        )}

        <div className="grid gap-3">
          {plans.map((p: any) => {
            const subscribed = myPlanIds.has(p.id);
            const mySub = activeSubs.find((s: any) => s.plan_id === p.id);
            return (
              <Card key={p.id} className={subscribed ? "border-primary" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">{p.name}</h4>
                    <span className="text-lg font-bold text-primary">
                      {fmtPrice(p.price, p.currency)}<span className="text-xs text-muted-foreground">/{p.interval}</span>
                    </span>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  {p.features?.length > 0 && (
                    <ul className="space-y-1">
                      {p.features.map((f: string, i: number) => (
                        <li key={i} className="text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.trial_days > 0 && !subscribed && (
                    <Badge variant="secondary" className="text-[10px]">{p.trial_days}-day free trial</Badge>
                  )}
                  {subscribed ? (
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary/10 text-primary text-[10px]">Active</Badge>
                      {mySub && !mySub.cancel_at_period_end && (
                        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => cancelSub(mySub.id)}>
                          Cancel
                        </Button>
                      )}
                      {mySub?.cancel_at_period_end && (
                        <span className="text-[10px] text-muted-foreground">Cancels {new Date(mySub.current_period_end).toLocaleDateString()}</span>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" className="w-full text-xs" onClick={() => subscribe(p.id, p.trial_days || 0)}>
                      {p.trial_days > 0 ? `Start ${p.trial_days}-day trial` : "Subscribe"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Seller mode
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" /> Subscription Plans
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCreating(!creating)}>
          <Plus className="h-3 w-3" /> New Plan
        </Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Plan Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Premium Monthly" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Price</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Interval</Label>
                <Select value={form.interval} onValueChange={v => setForm({ ...form, interval: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Trial Days</Label>
              <Input type="number" value={form.trial_days} onChange={e => setForm({ ...form, trial_days: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Features (one per line)</Label>
              <Textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} className="mt-1" rows={3} placeholder="Unlimited access&#10;Priority support&#10;..." />
            </div>
            <Button size="sm" className="w-full" onClick={createPlan} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create Plan"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing plans */}
      {plans.map((p: any) => {
        const subCount = subscriptions.filter((s: any) => s.plan_id === p.id && s.status === "active").length;
        return (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{fmtPrice(p.price, p.currency)}/{p.interval}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {subCount}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Subscribers summary */}
      {subscriptions.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold mb-2">Recent Subscribers</p>
            <div className="space-y-1.5">
              {subscriptions.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.subscriber_id?.slice(0, 8)}...</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {s.status}
                    </Badge>
                    {s.cancel_at_period_end && <Pause className="h-3 w-3 text-warning" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
