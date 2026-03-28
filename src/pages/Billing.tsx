import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CheckCircle, AlertTriangle, Loader2, ExternalLink, Clock, Sparkles, HelpCircle, LogOut, Mail, Users, Building2, User, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { PLANS, getPlanDisplay, PRODUCT_TIER_MAP, type PlanConfig } from "@/lib/stripe-plans";
import { createCheckoutSession, openCustomerPortal, signOut } from "@/repositories/billing.repository";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

const TIER_ICONS: Record<string, React.ReactNode> = {
  free: <Zap className="h-5 w-5" />,
  solo: <User className="h-5 w-5" />,
  team: <Users className="h-5 w-5" />,
  company: <Building2 className="h-5 w-5" />,
};

const TIER_COLORS: Record<string, string> = {
  free: "border-border",
  solo: "border-accent ring-2 ring-accent/20",
  team: "border-primary ring-2 ring-primary/20",
  company: "border-gold ring-2 ring-gold/20",
};

const FREE_FEATURES = [
  "Unlimited listings & services",
  "Photo uploads",
  "Share via WhatsApp, Telegram, Email",
  "Communication center",
  "Copy link & phone contact",
];

const Billing = () => {
  const { subscription, refreshSubscription, user } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("annual");
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: t("page.billing.activated") || "Subscription activated!", description: t("page.billing.thanks") || "Thank you" });
      refreshSubscription();
    }
  }, [searchParams, refreshSubscription, toast]);

  const handleCheckout = async (priceId: string) => {
    setLoadingPriceId(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: t("page.common.error") || "Error", description: err.message, variant: "destructive" });
      setLoadingPriceId(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: t("page.common.error") || "Error", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isSubscribed = subscription.subscribed && !subscription.isTrial;
  const currentTier = isSubscribed ? (PRODUCT_TIER_MAP[subscription.plan] || "solo") : "free";

  // Group plans by tier for current billing interval
  const tiers = useMemo(() => {
    return ["solo", "team", "company"].map(tier => {
      const suffix = billingInterval === "monthly" ? "_monthly" : "_annual";
      const plan = PLANS.find(p => p.key === `${tier}${suffix}`);
      return plan!;
    }).filter(Boolean);
  }, [billingInterval]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-2">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("page.billing.title") || "Subscription"}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t("page.billing.subtitle") || "Choose the plan that fits your business"}</p>

        {/* Trial banner */}
        {subscription.isTrial && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-foreground">{t("page.billing.trial_title") || "Trial"}</h2>
              <span className="bg-accent/20 text-accent text-xs font-semibold px-2 py-0.5 rounded-full">
                {subscription.trialDaysLeft != null ? `${subscription.trialDaysLeft} ${t("page.billing.days_left") || "days left"}` : ''}
              </span>
            </div>
            <Progress value={subscription.trialDaysLeft != null ? ((3 - subscription.trialDaysLeft) / 3) * 100 : 0} className="h-2 mb-3" />
            <p className="text-sm text-muted-foreground">{t("page.billing.trial_desc") || "Your trial gives you full access to all features."}</p>
          </div>
        )}

        {/* Active subscription info */}
        {isSubscribed && (
          <div className="bg-card rounded-xl shadow-card border border-success/30 p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <h2 className="font-semibold text-foreground">{t("page.billing.active") || "Active subscription"}</h2>
              <Badge variant="outline" className="border-success/40 text-success capitalize">{currentTier}</Badge>
            </div>
            {subscription.subscriptionEnd && (
              <p className="text-sm text-muted-foreground mb-3">
                {t("page.billing.next_renewal") || "Next renewal"}: {new Date(subscription.subscriptionEnd).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}
              </p>
            )}
            <button onClick={handlePortal} disabled={portalLoading} className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline h-9 px-3 rounded-lg hover:bg-accent/10 transition-colors">
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {t("page.billing.manage") || "Manage subscription"}
            </button>
          </div>
        )}

        {/* Billing interval toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all h-10 ${billingInterval === "monthly" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {t("page.billing.monthly") || "Monthly"}
          </button>
          <button
            onClick={() => setBillingInterval("annual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all h-10 relative ${billingInterval === "annual" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {t("page.billing.annual") || "Annual"}
            <span className="absolute -top-2 -right-2 bg-success text-success-foreground text-2xs font-bold px-1.5 py-0.5 rounded-full">-17%</span>
          </button>
        </div>

        {/* Plan cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* FREE card */}
          <div className={`relative bg-card rounded-xl p-5 shadow-card border transition-all ${currentTier === "free" && !isSubscribed ? "border-success ring-2 ring-success/20" : "border-border"}`}>
            {currentTier === "free" && !isSubscribed && (
              <Badge className="absolute -top-2.5 left-4 bg-success text-success-foreground text-[10px]">{t("page.billing.your_plan") || "Your plan"}</Badge>
            )}
            <div className="flex items-center gap-2 mb-1">
              {TIER_ICONS.free}
              <h3 className="font-semibold text-foreground text-lg">FREE</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Publish & share freely</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-foreground">0€</span>
              <span className="text-sm text-muted-foreground">/∞</span>
            </div>
            <ul className="space-y-2 mb-5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-2.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground cursor-default h-10">
              {currentTier === "free" ? (t("page.billing.current") || "Current plan") : "Free forever"}
            </button>
          </div>

          {/* Paid tiers */}
          {tiers.map((plan) => {
            const display = getPlanDisplay(plan, t);
            const isCurrent = isSubscribed && currentTier === plan.tier;
            const tierColor = TIER_COLORS[plan.tier] || TIER_COLORS.solo;

            return (
              <div key={plan.key} className={`relative bg-card rounded-xl p-5 shadow-card border transition-all ${isCurrent ? "border-success ring-2 ring-success/20" : tierColor}`}>
                {display.savings && (
                  <span className="absolute -top-2.5 right-4 bg-gradient-gold text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" />
                    {display.savings}
                  </span>
                )}
                {isCurrent && (
                  <Badge className="absolute -top-2.5 left-4 bg-success text-success-foreground text-[10px]">{t("page.billing.your_plan") || "Your plan"}</Badge>
                )}
                <div className="flex items-center gap-2 mb-1">
                  {TIER_ICONS[plan.tier]}
                  <h3 className="font-semibold text-foreground text-lg capitalize">{plan.tier}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{display.subtitle}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">{plan.price}€</span>
                  <span className="text-sm text-muted-foreground">/{display.interval}</span>
                </div>
                <ul className="space-y-1.5 mb-5">
                  {display.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button disabled className="w-full py-2.5 rounded-lg text-xs font-semibold bg-success/10 text-success cursor-default h-10">
                    {t("page.billing.current") || "Current plan"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.priceId)}
                    disabled={!!loadingPriceId}
                    className={`w-full py-2.5 rounded-lg text-xs font-semibold shadow-sm hover:opacity-90 transition-all disabled:opacity-50 h-10 ${
                      plan.tier === "company" ? "bg-gradient-gold text-accent-foreground" :
                      plan.tier === "team" ? "bg-primary text-primary-foreground" :
                      "bg-accent text-accent-foreground"
                    }`}
                  >
                    {loadingPriceId === plan.priceId ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (t("page.billing.subscribe") || "Subscribe")}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment methods */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>💳 {t("page.billing.card") || "Card"}</span>
          <span> Apple Pay</span>
          <span>🟢 Google Pay</span>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3">{t("page.billing.no_commitment") || "No commitment. Cancel anytime."}</p>

        {!subscription.subscribed && !subscription.loading && !subscription.isTrial && (
          <div className="mt-5 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{t("page.billing.trial_ended") || "Your trial has ended. Subscribe to unlock all features."}</p>
          </div>
        )}

        {/* Support */}
        <div className="mt-8 border-t border-border/50 pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {t("page.billing.support_title") || "Support & Account"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href="mailto:support@easy-locs.com" className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50 hover:border-accent/30 transition-all group">
              <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                <Mail className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("page.billing.contact_support") || "Contact Support"}</p>
                <p className="text-xs text-muted-foreground">support@easy-locs.com</p>
              </div>
            </a>
            <a href="/help" className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50 hover:border-accent/30 transition-all group">
              <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                <HelpCircle className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("page.billing.help_center") || "Help Center"}</p>
                <p className="text-xs text-muted-foreground">{t("page.billing.help_desc") || "FAQ & guides"}</p>
              </div>
            </a>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl p-3 transition-colors mt-4 h-11">
            <LogOut className="h-4 w-4" />
            {t("nav.logout") || "Log out"}
          </button>
          {user?.email && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {t("page.billing.logged_as") || "Logged in as"} {user.email}
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
