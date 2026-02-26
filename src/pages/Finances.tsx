import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, CreditCard, CheckCircle, Loader2, ExternalLink, AlertTriangle, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

interface ConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
}

const Finances = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const checkConnectStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-connect-status");
      if (error) throw error;
      setConnectStatus(data);
    } catch {
      setConnectStatus({ connected: false, onboarding_complete: false });
    } finally {
      setConnectLoading(false);
    }
  };

  useEffect(() => {
    if (user) checkConnectStatus();
  }, [user]);

  useEffect(() => {
    if (searchParams.get("connect") === "success") {
      toast({ title: "Compte Stripe connecté !", description: "Vérification du statut en cours..." });
      checkConnectStatus();
    }
  }, [searchParams]);

  const handleConnectOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setOnboardingLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finances</h1>
          <p className="text-muted-foreground mt-1">Suivi des revenus locatifs, charges et paiements en ligne</p>
        </div>

        {/* Stripe Connect Card */}
        <div className={`rounded-xl p-6 border shadow-card ${
          connectStatus?.onboarding_complete 
            ? "bg-card border-green-500/30" 
            : "bg-card border-accent/30"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${connectStatus?.onboarding_complete ? "bg-green-500/10" : "bg-accent/10"}`}>
              <CreditCard className={`h-6 w-6 ${connectStatus?.onboarding_complete ? "text-green-500" : "text-accent"}`} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground text-lg mb-1">Paiement en ligne des loyers</h2>
              {connectLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Vérification...
                </div>
              ) : connectStatus?.onboarding_complete ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" /> Compte Stripe connecté — vos locataires peuvent payer par CB et Apple Pay
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {connectStatus.charges_enabled && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Paiements activés</span>}
                    {connectStatus.payouts_enabled && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Virements activés</span>}
                  </div>
                  <button
                    onClick={handleConnectOnboarding}
                    disabled={onboardingLoading}
                    className="text-sm text-accent hover:underline flex items-center gap-1 mt-2"
                  >
                    {onboardingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                    Modifier mes informations bancaires
                  </button>
                </div>
              ) : connectStatus?.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-600 text-sm">
                    <AlertTriangle className="h-4 w-4" /> Onboarding en cours — complétez la vérification pour recevoir les paiements
                  </div>
                  <button
                    onClick={handleConnectOnboarding}
                    disabled={onboardingLoading}
                    className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm"
                  >
                    {onboardingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Continuer l'activation
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connectez votre compte bancaire pour recevoir les paiements de loyer directement par carte bancaire ou Apple Pay.
                  </p>
                  <button
                    onClick={handleConnectOnboarding}
                    disabled={onboardingLoading}
                    className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm"
                  >
                    {onboardingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Connecter mon compte Stripe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Revenus du mois</span>
            </div>
            <p className="text-2xl font-bold text-foreground">0 €</p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Impayés</span>
            </div>
            <p className="text-2xl font-bold text-foreground">0 €</p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <PiggyBank className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">Solde</span>
            </div>
            <p className="text-2xl font-bold text-foreground">0 €</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Le module finances sera alimenté automatiquement par vos appels de loyer et paiements.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Finances;
