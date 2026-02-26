import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CreditCard, CheckCircle, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS } from "@/lib/stripe-plans";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Billing = () => {
  const { subscription, refreshSubscription } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Refresh subscription on success callback
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Abonnement activé !", description: "Merci pour votre confiance." });
      refreshSubscription();
    }
  }, [searchParams, refreshSubscription, toast]);

  const handleCheckout = async (priceId: string) => {
    setLoadingPriceId(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPriceId(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = subscription.plan;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Abonnement</h1>
        <p className="text-muted-foreground text-sm mb-8">Gérez votre abonnement et votre facturation.</p>

        {/* Current plan */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Plan actuel</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-foreground capitalize">
              {subscription.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : currentPlan === "free" ? "Aucun abonnement" : currentPlan}
            </span>
            {subscription.subscribed && (
              <span className="bg-success/20 text-success text-xs font-medium px-2 py-0.5 rounded-full">Actif</span>
            )}
            {!subscription.subscribed && !subscription.loading && (
              <span className="bg-warning/20 text-warning text-xs font-medium px-2 py-0.5 rounded-full">Inactif</span>
            )}
          </div>
          {subscription.subscriptionEnd && (
            <p className="text-sm text-muted-foreground mt-2">
              Renouvellement : {new Date(subscription.subscriptionEnd).toLocaleDateString("fr-FR")}
            </p>
          )}
          {subscription.subscribed && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="mt-4 flex items-center gap-2 text-sm font-medium text-accent hover:underline"
            >
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gérer mon abonnement
            </button>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div
                key={plan.key}
                className={`bg-card rounded-xl p-6 shadow-card border transition-all ${
                  isCurrent ? "border-success ring-2 ring-success/20" : plan.highlight ? "border-accent ring-2 ring-accent/20" : "border-border/50"
                }`}
              >
                {isCurrent && (
                  <span className="inline-block bg-success/20 text-success text-xs font-semibold px-2 py-0.5 rounded-full mb-3">
                    Votre plan
                  </span>
                )}
                <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-foreground">{plan.price}€</span>
                  <span className="text-sm text-muted-foreground">/mois</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-success/10 text-success cursor-default"
                  >
                    Plan actuel
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.priceId)}
                    disabled={!!loadingPriceId}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      plan.highlight
                        ? "bg-gradient-gold text-accent-foreground shadow-gold hover:opacity-90"
                        : "border border-border text-foreground hover:bg-muted"
                    } disabled:opacity-50`}
                  >
                    {loadingPriceId === plan.priceId ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Choisir"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!subscription.subscribed && !subscription.loading && (
          <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Choisissez un abonnement pour accéder à toutes les fonctionnalités d'Adminia.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Billing;
