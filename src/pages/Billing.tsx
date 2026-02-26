import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CreditCard, CheckCircle, AlertTriangle, Loader2, ExternalLink, Clock, Sparkles, Globe, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { PLANS, type PlanTier } from "@/lib/stripe-plans";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Billing = () => {
  const { subscription, refreshSubscription } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("annual");
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Abonnement activé !", description: "Merci pour votre confiance." });
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
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
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
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = subscription.plan;
  const isSubscribed = subscription.subscribed && !subscription.isTrial;

  const tiers: { tier: PlanTier; icon: any; label: string }[] = [
    { tier: "local", icon: MapPin, label: "Local — 1 pays" },
    { tier: "global", icon: Globe, label: "Global — Tous les pays" },
  ];

  const filteredPlans = PLANS.filter((p) => p.interval === (billingInterval === "monthly" ? "mois" : "an"));

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Abonnement</h1>
        <p className="text-muted-foreground text-sm mb-2">Choisissez l'abonnement adapté à votre activité locative.</p>
        <p className="text-muted-foreground text-xs mb-8">
          Une seule plateforme pour gérer vos locations longue durée, Airbnb et Booking, avec des documents juridiques adaptés à chaque pays.
        </p>

        {/* Trial banner */}
        {subscription.isTrial && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-foreground">Essai gratuit — 3 jours</h2>
              <span className="bg-accent/20 text-accent text-xs font-semibold px-2 py-0.5 rounded-full">
                {subscription.trialDaysLeft != null ? `${subscription.trialDaysLeft} jour${subscription.trialDaysLeft > 1 ? 's' : ''} restant${subscription.trialDaysLeft > 1 ? 's' : ''}` : ''}
              </span>
            </div>
            <Progress value={subscription.trialDaysLeft != null ? ((3 - subscription.trialDaysLeft) / 3) * 100 : 0} className="h-2 mb-3" />
            <p className="text-sm text-muted-foreground">
              Accès complet à toutes les fonctionnalités. Choisissez un plan ci-dessous pour continuer après l'essai.
            </p>
          </div>
        )}

        {/* Current plan info */}
        {isSubscribed && (
          <div className="bg-card rounded-xl shadow-card border border-success/30 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-5 w-5 text-success" />
              <h2 className="font-semibold text-foreground">Abonnement actif</h2>
              <span className="bg-success/20 text-success text-xs font-medium px-2 py-0.5 rounded-full capitalize">{currentPlan?.replace("_", " ")}</span>
            </div>
            {subscription.subscriptionEnd && (
              <p className="text-sm text-muted-foreground mb-4">
                Prochain renouvellement : {new Date(subscription.subscriptionEnd).toLocaleDateString("fr-FR")}
              </p>
            )}
            <button onClick={handlePortal} disabled={portalLoading} className="flex items-center gap-2 text-sm font-medium text-accent hover:underline">
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gérer mon abonnement
            </button>
          </div>
        )}

        {/* Billing interval toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingInterval === "monthly" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingInterval("annual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingInterval === "annual" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
          >
            Annuel
          </button>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredPlans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const TierIcon = plan.tier === "global" ? Globe : MapPin;
            return (
              <div
                key={plan.key}
                className={`relative bg-card rounded-xl p-6 shadow-card border transition-all ${
                  isCurrent ? "border-success ring-2 ring-success/20" : plan.highlight ? "border-accent ring-2 ring-accent/20" : "border-border/50"
                }`}
              >
                {plan.savings && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {plan.savings}
                  </span>
                )}
                {isCurrent && (
                  <span className="inline-block bg-success/20 text-success text-xs font-semibold px-2 py-0.5 rounded-full mb-3">Votre plan</span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <TierIcon className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{plan.subtitle}</p>
                <div className="mt-2 mb-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}€</span>
                  <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button disabled className="w-full py-3 rounded-lg text-sm font-semibold bg-success/10 text-success cursor-default">Plan actuel</button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.priceId)}
                    disabled={!!loadingPriceId}
                    className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
                      plan.highlight ? "bg-gradient-gold text-accent-foreground shadow-gold hover:opacity-90" : "bg-foreground text-background hover:opacity-90"
                    } disabled:opacity-50`}
                  >
                    {loadingPriceId === plan.priceId ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "S'abonner"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment methods info */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <span>💳 Carte bancaire</span>
          <span> Apple Pay</span>
          <span>📱 Google Pay</span>
          <span>🏦 SEPA</span>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Aucun engagement – Annulation à tout moment. 3 jours d'essai gratuit inclus.
        </p>

        {/* Legal disclaimer */}
        <div className="mt-6 bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-2">
          <p>
            La plateforme fournit des modèles de documents juridiques automatisés basés sur la législation généralement applicable.
            Elle ne fournit pas de conseil juridique personnalisé et ne se substitue pas à un professionnel du droit.
          </p>
          <p>
            Les abonnements sont reconduits automatiquement jusqu'à résiliation. La résiliation prend effet à la fin de la période en cours. Aucun remboursement partiel.
          </p>
        </div>

        {!subscription.subscribed && !subscription.loading && !subscription.isTrial && (
          <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Votre essai est terminé. Choisissez un abonnement pour continuer à utiliser Easyloc.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Billing;
