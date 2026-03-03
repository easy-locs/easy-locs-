import { useState, useEffect } from "react";
import { CreditCard, Loader2, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const PaymentProvidersSettings = () => {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [defaultProvider, setDefaultProvider] = useState("stripe");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const fetchData = async () => {
      const { data: org } = await supabase
        .from("orgs")
        .select("paypal_email, default_payment_provider, stripe_account_id, stripe_onboarding_complete")
        .eq("id", orgId)
        .single();

      if (org) {
        setPaypalEmail((org as any).paypal_email || "");
        setDefaultProvider((org as any).default_payment_provider || "stripe");
      }

      // Check Stripe Connect status
      try {
        const { data } = await supabase.functions.invoke("check-connect-status");
        setConnectStatus(data);
      } catch {
        setConnectStatus({ connected: false });
      }

      setLoading(false);
    };
    fetchData();
  }, [orgId]);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    await supabase.from("orgs").update({
      paypal_email: paypalEmail || null,
      default_payment_provider: defaultProvider,
    } as any).eq("id", orgId);
    toast({ title: t("page.settings.org_updated") });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
      <div className="flex items-center gap-3 mb-5">
        <CreditCard className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">{t("page.settings.payment_providers")}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{t("page.settings.payment_providers_desc")}</p>

      <div className="space-y-4">
        {/* Stripe Connect */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#635bff]/10 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-[#635bff]">S</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Stripe Connect</p>
                <p className="text-[10px] text-muted-foreground">{t("page.settings.stripe_desc")}</p>
              </div>
            </div>
            {connectStatus?.onboarding_complete ? (
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle className="h-3.5 w-3.5" /> {t("page.settings.connected")}
              </span>
            ) : connectStatus?.connected ? (
              <span className="flex items-center gap-1 text-xs font-medium text-warning">
                <AlertCircle className="h-3.5 w-3.5" /> {t("page.settings.pending")}
              </span>
            ) : null}
          </div>
          {!connectStatus?.onboarding_complete && (
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="flex items-center gap-2 bg-[#635bff] text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-[#635bff]/90 disabled:opacity-50"
            >
              {connectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {connectStatus?.connected ? t("page.settings.complete_setup") : t("page.settings.connect_stripe")}
            </button>
          )}
        </div>

        {/* PayPal */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#003087]/10 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-[#003087]">P</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">PayPal</p>
              <p className="text-[10px] text-muted-foreground">{t("page.settings.paypal_desc")}</p>
            </div>
          </div>
          <input
            type="email"
            placeholder="votre@email-paypal.com"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Default provider */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.default_provider")}</label>
          <select
            value={defaultProvider}
            onChange={(e) => setDefaultProvider(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="bank_transfer">{t("page.settings.bank_transfer")}</option>
          </select>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>SaaS pur :</strong> {t("page.settings.saas_disclaimer")}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("page.settings.saving") : t("page.settings.save_org")}
        </button>
      </div>
    </div>
  );
};

export default PaymentProvidersSettings;
