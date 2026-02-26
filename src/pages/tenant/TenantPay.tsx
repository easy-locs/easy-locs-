import { useState, useEffect } from "react";
import { CreditCard, Loader2, ExternalLink, Home, Banknote, Building, CheckCircle } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

type PaymentMethod = "card" | "sepa" | "bank_transfer";

const PAYMENT_METHODS = [
  { id: "card" as const, label: "Carte bancaire / Apple Pay", icon: CreditCard, description: "Paiement sécurisé par carte, Apple Pay ou Google Pay" },
  { id: "sepa" as const, label: "Prélèvement SEPA", icon: Banknote, description: "Prélèvement automatique sur votre compte bancaire" },
  { id: "bank_transfer" as const, label: "Virement bancaire", icon: Building, description: "Virement manuel vers le compte du bailleur" },
];

const TenantPay = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [unpaidCalls, setUnpaidCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Handle payment return
  useEffect(() => {
    const payment = searchParams.get("payment");
    const rentCallId = searchParams.get("rent_call_id");
    if (payment === "success") {
      setPaymentSuccess(true);
      toast({ title: "✅ Paiement réussi !", description: "Votre loyer a été payé avec succès." });
      // Mark as paid in local state
      if (rentCallId) {
        setUnpaidCalls(prev => prev.filter(c => c.id !== rentCallId));
      }
    } else if (payment === "cancel") {
      toast({ title: "Paiement annulé", description: "Le paiement a été annulé.", variant: "destructive" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id, rent_amount, charges_amount, properties(label)")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();
      if (!tenant) { setLoading(false); return; }
      setTenantInfo(tenant);
      
      // Fetch org info for bank transfer
      const { data: org } = await supabase.from("orgs").select("name, email, phone").eq("id", tenant.org_id).single();
      setOrgInfo(org);
      
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

  const handlePay = async (rentCallId: string) => {
    if (method === "bank_transfer") {
      toast({ title: "Virement bancaire", description: "Effectuez le virement puis prévenez votre bailleur via la messagerie." });
      return;
    }
    setPayingId(rentCallId);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", {
        body: { rent_call_id: rentCallId, payment_method: method },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erreur de paiement", description: err.message, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  const fmt = (n: number) => n?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) ?? "—";

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Payer mon loyer</h1>
        <p className="text-muted-foreground mb-6">Choisissez votre mode de paiement et réglez votre loyer.</p>

        {/* Payment success banner */}
        {paymentSuccess && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Paiement enregistré avec succès !</p>
              <p className="text-xs text-muted-foreground">Votre quittance sera générée automatiquement.</p>
            </div>
          </div>
        )}

        {/* Payment method selector */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-foreground mb-3">Mode de paiement</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setMethod(pm.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  method === pm.id
                    ? "border-accent bg-accent/5 shadow-sm"
                    : "border-border hover:border-accent/40"
                }`}
              >
                <pm.icon className={`h-6 w-6 ${method === pm.id ? "text-accent" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium text-foreground">{pm.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{pm.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bank transfer info */}
        {method === "bank_transfer" && orgInfo && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Informations pour le virement</h3>
            <p className="text-sm text-muted-foreground">Bénéficiaire : <span className="font-medium text-foreground">{orgInfo.name}</span></p>
            <p className="text-sm text-muted-foreground mt-1">Contactez votre bailleur pour obtenir le RIB/IBAN :</p>
            {orgInfo.email && <p className="text-sm text-accent mt-1">{orgInfo.email}</p>}
            {orgInfo.phone && <p className="text-sm text-muted-foreground">{orgInfo.phone}</p>}
            <p className="text-xs text-muted-foreground mt-3">Indiquez votre nom et la période en référence du virement.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !tenantInfo ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Home className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun logement lié à votre compte.</p>
          </div>
        ) : unpaidCalls.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <CheckCircle className="h-10 w-10 text-accent/30 mx-auto mb-3" />
            <p className="text-foreground font-medium">Vous êtes à jour !</p>
            <p className="text-sm text-muted-foreground mt-1">Aucun loyer en attente de paiement.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unpaidCalls.map((call) => (
              <div key={call.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{call.month}</p>
                  <p className="text-sm text-muted-foreground">
                    Loyer {fmt(call.rent_amount)} + Charges {fmt(call.charges_amount)}
                  </p>
                  <p className="text-lg font-bold text-foreground mt-1">{fmt(call.total_amount)}</p>
                </div>
                <button
                  onClick={() => handlePay(call.id)}
                  disabled={payingId === call.id}
                  className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  {payingId === call.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {method === "bank_transfer" ? "Infos virement" : "Payer"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantPay;
