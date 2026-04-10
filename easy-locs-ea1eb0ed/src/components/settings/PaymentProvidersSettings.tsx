import { useState, useEffect, useMemo } from "react";
import { CreditCard, Loader2, CheckCircle, ExternalLink, AlertCircle, Building2, Link as LinkIcon, XCircle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as ppRepo from "@/repositories/payment-providers.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { isSepaCountry } from "@/lib/sepa-countries";

type ProviderStatus = "connected" | "incomplete" | "missing";

const StatusBadge = ({ status }: { status: ProviderStatus }) => {
  if (status === "connected") return (
    <span className="flex items-center gap-1 text-xs font-medium text-success">
      <CheckCircle className="h-3.5 w-3.5" /> Connected
    </span>
  );
  if (status === "incomplete") return (
    <span className="flex items-center gap-1 text-xs font-medium text-warning">
      <AlertCircle className="h-3.5 w-3.5" /> Incomplete
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <XCircle className="h-3.5 w-3.5" /> Not configured
    </span>
  );
};

const PaymentProvidersSettings = () => {
  const { orgId, userCountry } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [defaultProvider, setDefaultProvider] = useState("stripe");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [orgCountry, setOrgCountry] = useState(userCountry || "FR");
  const sepaEligible = useMemo(() => isSepaCountry(orgCountry), [orgCountry]);

  const [bankHolder, setBankHolder] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankBic, setBankBic] = useState("");
  const [bankName, setBankName] = useState("");
  const [paymentLinkUrl, setPaymentLinkUrl] = useState("");

  useEffect(() => {
    if (!orgId) return;
    const fetchData = async () => {
      const org = await ppRepo.fetchOrgPaymentSettings(orgId);
      if (org) {
        setPaypalEmail(org.paypal_email || "");
        setDefaultProvider(org.default_payment_provider || "stripe");
        if (org.country) setOrgCountry(org.country);
        setBankHolder(org.bank_holder_name || "");
        setBankIban(org.bank_iban || "");
        setBankBic(org.bank_bic || "");
        setBankName(org.bank_name || "");
        setPaymentLinkUrl(org.payment_link_url || "");
      }
      try {
        const data = await ppRepo.checkConnectStatus();
        setConnectStatus(data);
      } catch {
        setConnectStatus({ connected: false });
      }
      setLoading(false);
    };
    fetchData();
  }, [orgId]);

  // Provider status helpers
  const stripeStatus: ProviderStatus = connectStatus?.onboarding_complete ? "connected" : connectStatus?.connected ? "incomplete" : "missing";
  const bankStatus: ProviderStatus = bankIban && bankHolder ? "connected" : bankIban || bankHolder ? "incomplete" : "missing";
  const linkStatus: ProviderStatus = paymentLinkUrl ? "connected" : "missing";
  const paypalStatus: ProviderStatus = paypalEmail ? "connected" : "missing";

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const data = await ppRepo.createConnectAccount();
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!confirm(t("page.finances.disconnect_confirm"))) return;
    setDisconnectingStripe(true);
    try {
      await ppRepo.disconnectStripe();
      toast({ title: t("page.finances.disconnect_success") });
      setConnectStatus({ connected: false, onboarding_complete: false });
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setDisconnectingStripe(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    await ppRepo.savePaymentSettings(orgId, {
      paypal_email: paypalEmail || null,
      default_payment_provider: defaultProvider,
      bank_holder_name: bankHolder || null,
      bank_iban: bankIban || null,
      bank_bic: bankBic || null,
      bank_name: bankName || null,
      payment_link_url: paymentLinkUrl || null,
    });
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

  const inputClass = "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
      <div className="flex items-center gap-3 mb-2">
        <CreditCard className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">{t("page.settings.payment_providers")}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("page.settings.payment_providers_desc")}</p>

      {/* Provider overview status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Stripe", status: stripeStatus },
          { label: "Bank Transfer", status: bankStatus },
          { label: "Payment Link", status: linkStatus },
          { label: "PayPal", status: paypalStatus },
        ].map((p) => (
          <div key={p.label} className={`rounded-lg border p-3 text-center ${
            p.status === "connected" ? "border-success/30 bg-success/5" : p.status === "incomplete" ? "border-warning/30 bg-warning/5" : "border-border bg-muted/20"
          }`}>
            <p className="text-xs font-medium text-foreground mb-1">{p.label}</p>
            <StatusBadge status={p.status} />
          </div>
        ))}
      </div>

      {/* SaaS architecture disclaimer */}
      <div className="flex items-start gap-2.5 bg-accent/5 border border-accent/20 rounded-lg p-3 mb-6">
        <Shield className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">SaaS Architecture:</strong> {t("page.settings.saas_disclaimer") || "Easy-Locs only collects subscription fees. All operational payments go directly to your organization's accounts. No funds transit through the platform."}
        </p>
      </div>

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
            <StatusBadge status={stripeStatus} />
          </div>
          <div className="flex items-center gap-2 mt-2">
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
            {connectStatus?.connected && (
              <button
                onClick={handleDisconnectStripe}
                disabled={disconnectingStripe}
                className="flex items-center gap-2 text-destructive text-sm hover:underline disabled:opacity-50"
              >
                {disconnectingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {t("page.finances.disconnect_stripe")}
              </button>
            )}
          </div>
        </div>

        {/* SEPA */}
        {sepaEligible ? (
          <div className="border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#0070ba]/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-[#0070ba]">€</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">SEPA Direct Debit</p>
                  <p className="text-[10px] text-muted-foreground">{t("page.settings.sepa_desc") || "Automatic SEPA direct debit (SEPA zone only)"}</p>
                </div>
              </div>
              <StatusBadge status={stripeStatus === "connected" ? "connected" : "missing"} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{t("page.settings.sepa_via_stripe") || "Enabled via Stripe Connect."}</p>
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-muted-foreground">€</span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">SEPA Direct Debit</p>
                <p className="text-[10px] text-muted-foreground">{t("page.settings.sepa_unavailable") || "Not available — your country is not in the SEPA zone"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bank Transfer */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("page.settings.bank_transfer") || "Bank Transfer"}</p>
                <p className="text-[10px] text-muted-foreground">{t("page.settings.bank_transfer_desc") || "Clients pay directly via wire transfer"}</p>
              </div>
            </div>
            <StatusBadge status={bankStatus} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("page.settings.bank_holder") || "Account Holder"}</label>
              <input type="text" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="Company Name / Full Name" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("page.settings.bank_name_label") || "Bank Name"}</label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BNP Paribas, HSBC, etc." className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">IBAN</label>
              <input type="text" value={bankIban} onChange={(e) => setBankIban(e.target.value)} placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">BIC / SWIFT</label>
              <input type="text" value={bankBic} onChange={(e) => setBankBic(e.target.value)} placeholder="BNPAFRPP" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Payment Link */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <LinkIcon className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("page.settings.payment_link") || "Payment Link"}</p>
                <p className="text-[10px] text-muted-foreground">{t("page.settings.payment_link_desc") || "Custom payment link (Stripe, PayPal.me, Wise, etc.)"}</p>
              </div>
            </div>
            <StatusBadge status={linkStatus} />
          </div>
          <input type="url" value={paymentLinkUrl} onChange={(e) => setPaymentLinkUrl(e.target.value)} placeholder="https://pay.stripe.com/... or https://paypal.me/..." className={inputClass} />
        </div>

        {/* PayPal */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#003087]/10 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-[#003087]">P</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">PayPal</p>
                <p className="text-[10px] text-muted-foreground">{t("page.settings.paypal_desc")}</p>
              </div>
            </div>
            <StatusBadge status={paypalStatus} />
          </div>
          <input type="email" placeholder="your@paypal-email.com" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} className={inputClass} />
        </div>

        {/* Default provider */}
        <div className="border border-border rounded-xl p-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.default_provider") || "Default Payment Provider"}</label>
          <p className="text-[10px] text-muted-foreground mb-2">If the default provider is not fully configured, the system will automatically fallback to the next available method.</p>
          <select value={defaultProvider} onChange={(e) => setDefaultProvider(e.target.value)} className={inputClass}>
            <option value="stripe">Stripe (Card)</option>
            {sepaEligible && <option value="sepa">SEPA Direct Debit</option>}
            <option value="bank_transfer">{t("page.settings.bank_transfer") || "Bank Transfer"}</option>
            <option value="payment_link">{t("page.settings.payment_link") || "Payment Link"}</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-accent text-accent-foreground font-medium px-5 py-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? t("page.settings.saving") : t("page.settings.save_org") || "Save Payment Settings"}
        </button>
      </div>
    </div>
  );
};

export default PaymentProvidersSettings;
