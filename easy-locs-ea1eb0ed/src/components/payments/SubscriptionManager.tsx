import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, ArrowUp, ArrowDown, X, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  createSubscription,
  manageSubscription,
  openSubscriptionPortal,
  fetchCurrentSubscription,
} from "@/repositories/payments.repository";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  stripePriceId: string;
  popular?: boolean;
}

const ENV_PLANS = import.meta.env.VITE_SUBSCRIPTION_PLANS;
let parsedPlans: SubscriptionPlan[] = [];
try {
  if (ENV_PLANS) parsedPlans = JSON.parse(ENV_PLANS);
} catch { /* use defaults */ }

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "solo_monthly",
    name: "Solo",
    price: 9.99,
    currency: "EUR",
    interval: "month",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_SOLO_MONTHLY || "",
    features: ["1 property", "Basic analytics", "Email support"],
  },
  {
    id: "team_monthly",
    name: "Team",
    price: 29.99,
    currency: "EUR",
    interval: "month",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_TEAM_MONTHLY || "",
    features: ["10 properties", "Advanced analytics", "Priority support", "Team collaboration"],
    popular: true,
  },
  {
    id: "company_monthly",
    name: "Company",
    price: 99.99,
    currency: "EUR",
    interval: "month",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_COMPANY_MONTHLY || "",
    features: ["Unlimited properties", "Full analytics suite", "Dedicated support", "API access", "Custom branding"],
  },
  {
    id: "solo_annual",
    name: "Solo",
    price: 99.99,
    currency: "EUR",
    interval: "year",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_SOLO_ANNUAL || "",
    features: ["1 property", "Basic analytics", "Email support"],
  },
  {
    id: "team_annual",
    name: "Team",
    price: 299.99,
    currency: "EUR",
    interval: "year",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_TEAM_ANNUAL || "",
    features: ["10 properties", "Advanced analytics", "Priority support", "Team collaboration"],
    popular: true,
  },
  {
    id: "company_annual",
    name: "Company",
    price: 999.99,
    currency: "EUR",
    interval: "year",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_COMPANY_ANNUAL || "",
    features: ["Unlimited properties", "Full analytics suite", "Dedicated support", "API access", "Custom branding"],
  },
];

const PLANS: SubscriptionPlan[] = parsedPlans.length > 0 ? parsedPlans : DEFAULT_PLANS;

interface SubscriptionManagerProps {
  userId: string;
  onSubscriptionChange?: (subscription: any) => void;
}

export default function SubscriptionManager({ userId, onSubscriptionChange }: SubscriptionManagerProps) {
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month");
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    try {
      const data = await fetchCurrentSubscription(userId);
      setCurrentSub(data);
    } catch {
      // no active subscription
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const filteredPlans = PLANS.filter((p) => p.interval === billingCycle);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setActionLoading(plan.id);
    setError(null);

    try {
      const result = await createSubscription({
        price_id: plan.stripePriceId,
        plan_id: plan.id,
      });

      if (result?.checkout_url) {
        window.location.href = result.checkout_url;
      } else if (result?.subscription_id) {
        toast.success(`Subscribed to ${plan.name} plan`);
        await loadSubscription();
        onSubscriptionChange?.(result);
      }
    } catch (err: any) {
      setError(err.message || "Subscription failed");
      toast.error("Subscription failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePlan = async (plan: SubscriptionPlan, action: "upgrade" | "downgrade") => {
    setActionLoading(plan.id);
    setError(null);

    try {
      const result = await manageSubscription({
        action,
        new_price_id: plan.stripePriceId,
        subscription_id: currentSub?.stripe_subscription_id,
      });

      toast.success(`Plan ${action === "upgrade" ? "upgraded" : "downgraded"} successfully`);
      await loadSubscription();
      onSubscriptionChange?.(result);
    } catch (err: any) {
      setError(err.message || `Plan ${action} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setActionLoading("cancel");
    setError(null);

    try {
      await manageSubscription({
        action: "cancel",
        subscription_id: currentSub?.stripe_subscription_id,
      });

      toast.success("Subscription cancelled. It will remain active until the end of the billing period.");
      await loadSubscription();
      onSubscriptionChange?.(null);
    } catch (err: any) {
      setError(err.message || "Cancellation failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading("portal");
    try {
      const result = await openSubscriptionPortal();
      if (result?.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      toast.error("Failed to open billing portal");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlanId = currentSub?.plan_id;

  return (
    <div className="space-y-4">
      {currentSub && (
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Current plan</p>
              <p className="text-sm font-bold text-foreground">{currentSub.plan_name || currentSub.plan_id}</p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
              {currentSub.status}
            </span>
          </div>
          {currentSub.current_period_end && (
            <p className="text-[0.625rem] text-muted-foreground">
              {currentSub.cancel_at_period_end
                ? `Cancels on ${new Date(currentSub.current_period_end).toLocaleDateString()}`
                : `Renews on ${new Date(currentSub.current_period_end).toLocaleDateString()}`}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={actionLoading === "portal"}
              className="rounded-xl text-xs"
            >
              {actionLoading === "portal" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3 mr-1" />}
              Manage Billing
            </Button>
            {!currentSub.cancel_at_period_end && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={actionLoading === "cancel"}
                className="rounded-xl text-xs text-destructive hover:text-destructive"
              >
                {actionLoading === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-muted/30">
        {(["month", "year"] as const).map((cycle) => (
          <button
            key={cycle}
            onClick={() => setBillingCycle(cycle)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
            style={{
              background: billingCycle === cycle ? "hsl(var(--primary))" : "transparent",
              color: billingCycle === cycle ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {cycle === "month" ? "Monthly" : "Annual (Save 17%)"}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      <div className="grid gap-3">
        {filteredPlans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const currentIndex = filteredPlans.findIndex((p) => p.id === currentPlanId);
          const planIndex = filteredPlans.indexOf(plan);
          const isUpgrade = currentPlanId && planIndex > currentIndex;
          const isDowngrade = currentPlanId && planIndex < currentIndex;

          return (
            <div
              key={plan.id}
              className="p-4 rounded-2xl border transition-all"
              style={{
                borderColor: plan.popular ? "hsl(var(--primary))" : isCurrent ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.2)",
                background: isCurrent ? "hsl(var(--primary) / 0.03)" : "hsl(var(--card))",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                    {plan.popular && (
                      <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Popular
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">
                        Current
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-foreground">{plan.currency === "EUR" ? "€" : "$"}{plan.price}</span>
                  <span className="text-xs text-muted-foreground">/{plan.interval === "month" ? "mo" : "yr"}</span>
                </div>
              </div>

              <ul className="space-y-1 mb-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button disabled variant="outline" className="w-full rounded-xl text-xs h-9">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Current Plan
                </Button>
              ) : isUpgrade ? (
                <Button
                  onClick={() => handleChangePlan(plan, "upgrade")}
                  disabled={!!actionLoading}
                  className="w-full rounded-xl text-xs h-9"
                >
                  {actionLoading === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ArrowUp className="h-3.5 w-3.5 mr-1" />}
                  Upgrade
                </Button>
              ) : isDowngrade ? (
                <Button
                  onClick={() => handleChangePlan(plan, "downgrade")}
                  disabled={!!actionLoading}
                  variant="outline"
                  className="w-full rounded-xl text-xs h-9"
                >
                  {actionLoading === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ArrowDown className="h-3.5 w-3.5 mr-1" />}
                  Downgrade
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={!!actionLoading}
                  className="w-full rounded-xl text-xs h-9"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {actionLoading === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CreditCard className="h-3.5 w-3.5 mr-1" />}
                  Subscribe
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
