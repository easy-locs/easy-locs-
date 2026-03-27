import { useState, useEffect, useMemo, useCallback } from "react";
import { CreditCard, Loader2, ExternalLink, Home, Banknote, Building, CheckCircle } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { useI18n } from "@/lib/i18n";
import { getAvailablePaymentMethods } from "@/lib/sepa-countries";
import SepaPaymentFlow from "@/components/tenant/SepaPaymentFlow";

type PaymentMethod = "card" | "sepa" | "bank_transfer";

interface OwnerBankInfo {
  full_name: string;
  bank_iban: string | null;
  bank_bic: string | null;
  bank_name: string | null;
}

const TenantPay = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { propertyCountry, fmt: fmtProp, L } = useTenantProperty();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [ownerBank, setOwnerBank] = useState<OwnerBankInfo | null>(null);
  const [hasStripeConnect, setHasStripeConnect] = useState(false);
  const [unpaidCalls, setUnpaidCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [expandedSepaId, setExpandedSepaId] = useState<string | null>(null);

  const ALL_METHODS = [
    { id: "card" as const, label: t("page.tenant_pay.card_label") || L.payRent, icon: CreditCard, description: "Visa, Mastercard, Apple Pay, Google Pay" },
    { id: "sepa" as const, label: t("page.tenant_pay.sepa_label") || "SEPA", icon: Banknote, description: t("page.tenant_pay.sepa_desc") || "SEPA direct debit or transfer" },
    { id: "bank_transfer" as const, label: t("page.tenant_pay.transfer_label") || L.transfer || "Transfer", icon: Building, description: t("page.tenant_pay.transfer_desc") || "Standard bank transfer" },
  ];

  const availableMethodIds = useMemo(() => getAvailablePaymentMethods(propertyCountry), [propertyCountry]);
  const PAYMENT_METHODS = ALL_METHODS.filter(m => availableMethodIds.includes(m.id));

  useEffect(() => {
    const payment = searchParams.get("payment");
    const rentCallId = searchParams.get("rent_call_id");
    if (payment === "success") {
      setPaymentSuccess(true);
      toast({ title: t("page.tenant_pay.toast_success"), description: t("page.tenant_pay.toast_success_desc") });
      if (rentCallId) {
        setUnpaidCalls((prev) => prev.filter((c) => c.id !== rentCallId));
      }
    } else if (payment === "cancel") {
      toast({ title: t("page.tenant_pay.toast_cancel"), description: t("page.tenant_pay.toast_cancel_desc"), variant: "destructive" });
    }
  }, [searchParams, t, toast]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id, property_id, rent_amount, charges_amount, properties(label)")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();

      if (!tenant) { setLoading(false); return; }
      setTenantInfo(tenant);

      // Fetch org info + Stripe Connect status
      const { data: org } = await supabase
        .from("orgs")
        .select("name, email, phone, stripe_account_id, stripe_onboarding_complete")
        .eq("id", tenant.org_id)
        .single();
      setOrgInfo(org);
      setHasStripeConnect(!!(org?.stripe_account_id && org.stripe_onboarding_complete));

      // Fetch owner bank info for manual SEPA transfer (via secure RPC)
      const { data: ownerBankData } = await supabase
        .rpc("get_owner_bank_for_tenant", { _org_id: tenant.org_id });
      const ownerProfile = Array.isArray(ownerBankData) ? ownerBankData[0] || null : ownerBankData;
      setOwnerBank(ownerProfile || null);

      // Fetch unpaid rent calls
      const { data } = await supabase
        .from("rent_calls")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("paid", false)
        .order("month", { ascending: false });
      setUnpaidCalls(data || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  /** Generate a deterministic payment reference */
  const getPaymentReference = useCallback((rentCallId: string, month: string) => {
    const shortId = rentCallId.slice(0, 8).toUpperCase();
    const monthClean = month.replace(/[^a-zA-Z0-9]/g, "");
    return `LOYER-${monthClean}-${shortId}`;
  }, []);

  const handlePayStripe = async (rentCallId: string) => {
    setPayingId(rentCallId);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", {
        body: { rent_call_id: rentCallId, payment_method: method === "sepa" ? "sepa" : "card" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      const msg = err.message || String(err);
      const userMsg = msg.includes("Stripe Connect")
        ? (t("page.tenant.stripe_not_ready") || "The landlord has not yet enabled online payment. Contact them or pay by bank transfer.")
        : msg;
      toast({ title: t("page.common.error") || "Error", description: userMsg, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  const handleDeclareTransfer = async (rentCallId: string, month: string) => {
    try {
      // Update rent call status to "processing"
      await supabase
        .from("rent_calls")
        .update({ payment_status: "processing", payment_method: "bank_transfer" } as any)
        .eq("id", rentCallId);

      // Find org owner to notify
      if (tenantInfo?.org_id) {
        const { data: members } = await supabase
          .from("org_members")
          .select("user_id")
          .eq("org_id", tenantInfo.org_id)
          .eq("role", "owner")
          .limit(1);
        const ownerId = members?.[0]?.user_id;

        // Create notification for landlord
        if (ownerId) {
          await (supabase as any).from("app_notifications").insert({
            user_id: ownerId,
            scope: "global",
            category: "payment",
            title: `🏦 ${t("page.tenant_pay.transfer_declared") || "Bank transfer declared"}`,
            body: `${user?.email} - ${month} - ${fmt(unpaidCalls.find(c => c.id === rentCallId)?.total_amount || 0)}`,
            severity: "info",
            metadata: { target_type: "rent_call", target_id: rentCallId, module: "rental" },
          });
        }
      }

      toast({
        title: t("page.tenant_pay.transfer_declared") || "Transfer declared",
        description: t("page.tenant_pay.transfer_declared_desc") || "Your landlord has been notified. Payment will be confirmed upon receipt.",
      });

      // Update local state
      setUnpaidCalls(prev => prev.map(c => c.id === rentCallId ? { ...c, payment_status: "processing" } : c));
    } catch (err: any) {
      toast({ title: t("page.common.error") || "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePay = async (rentCallId: string) => {
    const call = unpaidCalls.find(c => c.id === rentCallId);
    if (method === "sepa") {
      setExpandedSepaId(expandedSepaId === rentCallId ? null : rentCallId);
      return;
    }
    if (method === "bank_transfer") {
      setExpandedSepaId(null);
      return;
    }
    // Card payment — check if Stripe Connect is available first
    if (!hasStripeConnect) {
      toast({
        title: t("page.tenant.stripe_not_ready") || "Online payment unavailable",
        description: t("page.tenant.stripe_not_ready_desc") || "The landlord has not yet enabled online payment. Use bank transfer or contact your landlord.",
        variant: "destructive",
      });
      return;
    }
    await handlePayStripe(rentCallId);
  };

  const fmt = (n: number) => fmtProp(n);

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("page.tenant_pay.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("page.tenant_pay.subtitle")}</p>

        {paymentSuccess && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("page.tenant_pay.success_title")}</p>
              <p className="text-xs text-muted-foreground">{t("page.tenant_pay.success_desc")}</p>
            </div>
          </div>
        )}

        {/* Payment method selector */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-foreground mb-3">{t("page.tenant_pay.method_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <button key={pm.id} onClick={() => { setMethod(pm.id); setExpandedSepaId(null); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${method === pm.id ? "border-accent bg-accent/5 shadow-sm" : "border-border hover:border-accent/40"}`}>
                <pm.icon className={`h-6 w-6 ${method === pm.id ? "text-accent" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium text-foreground">{pm.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{pm.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bank transfer info (classic non-SEPA) */}
        {method === "bank_transfer" && orgInfo && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">{t("page.tenant_pay.transfer_info")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("page.tenant_pay.beneficiary")} : <span className="font-medium text-foreground">{orgInfo.name}</span>
            </p>
            {ownerBank?.bank_iban && (
              <p className="text-sm text-muted-foreground mt-1">
                IBAN: <code className="font-mono text-foreground">{ownerBank.bank_iban}</code>
              </p>
            )}
            {ownerBank?.bank_bic && (
              <p className="text-sm text-muted-foreground mt-1">
                BIC: <code className="font-mono text-foreground">{ownerBank.bank_bic}</code>
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{t("page.tenant_pay.transfer_help")}</p>
            {orgInfo.email && <p className="text-sm text-accent mt-1">{orgInfo.email}</p>}
            <p className="text-xs text-muted-foreground mt-3">{t("page.tenant_pay.transfer_ref")}</p>
          </div>
        )}

        {/* Requests / Needs section (future) */}

        {/* Rent calls list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !tenantInfo ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Home className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("page.tenant_pay.no_property")}</p>
          </div>
        ) : unpaidCalls.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <CheckCircle className="h-10 w-10 text-accent/30 mx-auto mb-3" />
            <p className="text-foreground font-medium">{t("page.tenant_pay.up_to_date")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("page.tenant_pay.no_unpaid")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unpaidCalls.map((call) => (
              <div key={call.id} className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
                {/* Rent call header */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-destructive" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{call.month}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{t("page.tenant_pay.rent_line")}</span>
                        <span className="currency-value whitespace-nowrap">{fmt(call.rent_amount)}</span>
                        <span>+</span>
                        <span>{t("page.tenant_pay.charges_line")}</span>
                        <span className="currency-value whitespace-nowrap">{fmt(call.charges_amount)}</span>
                      </p>
                      <p className="text-lg font-bold text-foreground mt-1 currency-value whitespace-nowrap">{fmt(call.total_amount)}</p>
                      {call.payment_status && call.payment_status !== "unpaid" && (
                        <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium mt-1 ${
                          call.payment_status === "processing" ? "bg-warning/10 text-warning" :
                          call.payment_status === "pending" ? "bg-info/10 text-info" :
                          call.payment_status === "failed" ? "bg-destructive/10 text-destructive" :
                          "bg-accent/10 text-accent"
                        }`}>
                           {call.payment_status === "processing" ? (t("status.processing") || "Processing") :
                            call.payment_status === "pending" ? (t("status.pending") || "Pending") :
                            call.payment_status === "failed" ? (t("status.failed") || "Failed") :
                            call.payment_status}
                        </span>
                      )}
                    </div>

                    {method === "bank_transfer" ? (
                      <button
                        onClick={() => handleDeclareTransfer(call.id, call.month)}
                        disabled={payingId === call.id || call.payment_status === "processing"}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 bg-gradient-gold text-accent-foreground font-semibold px-5 rounded-xl shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm shrink-0"
                      >
                        {call.payment_status === "processing" ? (
                          <><CheckCircle className="h-4 w-4" /> {t("status.processing") || "Processing"}</>
                        ) : (
                          <><Building className="h-4 w-4" /> {t("page.tenant_pay.declare_transfer") || "J'ai effectué le virement"}</>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePay(call.id)}
                        disabled={payingId === call.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 bg-gradient-gold text-accent-foreground font-semibold px-5 rounded-xl shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm shrink-0"
                      >
                        {payingId === call.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : method === "sepa" ? (
                          <Banknote className="h-4 w-4" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        {method === "sepa" ? (t("sepa.pay_sepa") || "Pay SEPA") :
                          (t("page.tenant_pay.pay_btn") || "Pay")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded SEPA flow */}
                {method === "sepa" && expandedSepaId === call.id && (
                  <div className="border-t border-border p-5 bg-muted/20">
                    <SepaPaymentFlow
                      rentCall={call}
                      ownerBank={ownerBank}
                      hasStripeConnect={hasStripeConnect}
                      fmt={fmt}
                      onPayStripe={handlePayStripe}
                      payingId={payingId}
                      paymentReference={getPaymentReference(call.id, call.month)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantPay;
