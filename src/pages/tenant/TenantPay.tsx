import { useState, useEffect, useMemo } from "react";
import { CreditCard, Loader2, ExternalLink, Home, Banknote, Building, CheckCircle } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { formatCurrency } from "@/lib/country-config";

type PaymentMethod = "card" | "sepa" | "bank_transfer";

const COPY_BY_LANG: Record<string, any> = {
  fr: {
    title: "Payer mon loyer", subtitle: "Choisissez votre mode de paiement et réglez votre loyer.",
    successTitle: "Paiement enregistré avec succès !", successDesc: "Votre quittance sera générée automatiquement.",
    methodTitle: "Mode de paiement",
    cardLabel: "Carte / Apple Pay / Google Pay", cardDesc: "Paiement instantané selon les moyens disponibles sur votre appareil.",
    sepaLabel: "Prélèvement SEPA", sepaDesc: "Vos coordonnées bancaires sont enregistrées pour les prochains prélèvements.",
    transferLabel: "Virement bancaire", transferDesc: "Virement manuel vers le compte du bailleur.",
    transferInfo: "Informations pour le virement", transferHelp: "Contactez votre bailleur pour obtenir le RIB/IBAN :",
    transferRef: "Indiquez votre nom et la période en référence du virement.",
    noProperty: "Aucun logement lié à votre compte.", upToDate: "Vous êtes à jour !",
    noUnpaid: "Aucun loyer en attente de paiement.", rentLine: "Loyer", chargesLine: "Charges",
    transferBtn: "Infos virement", payBtn: "Payer",
    toastSuccessTitle: "✅ Paiement réussi !", toastSuccessDesc: "Votre loyer a été payé avec succès.",
    toastCancelTitle: "Paiement annulé", toastCancelDesc: "Le paiement a été annulé.",
    toastTransferTitle: "Virement bancaire", toastTransferDesc: "Effectuez le virement puis prévenez votre bailleur via la messagerie.",
    beneficiary: "Bénéficiaire",
  },
  en: {
    title: "Pay my rent", subtitle: "Choose your payment method and settle your rent.",
    successTitle: "Payment successfully recorded!", successDesc: "Your receipt will be generated automatically.",
    methodTitle: "Payment method",
    cardLabel: "Card / Apple Pay / Google Pay", cardDesc: "Instant payment based on methods available on your device.",
    sepaLabel: "SEPA Direct Debit", sepaDesc: "Your bank details are saved for future direct debits.",
    transferLabel: "Bank transfer", transferDesc: "Manual transfer to landlord account.",
    transferInfo: "Transfer details", transferHelp: "Contact your landlord to receive IBAN details:",
    transferRef: "Use your name and rent period as transfer reference.",
    noProperty: "No property linked to your account.", upToDate: "You are up to date!",
    noUnpaid: "No unpaid rent calls.", rentLine: "Rent", chargesLine: "Charges",
    transferBtn: "Transfer info", payBtn: "Pay",
    toastSuccessTitle: "✅ Payment successful!", toastSuccessDesc: "Your rent was paid successfully.",
    toastCancelTitle: "Payment cancelled", toastCancelDesc: "The payment was cancelled.",
    toastTransferTitle: "Bank transfer", toastTransferDesc: "Send the transfer and notify your landlord via messages.",
    beneficiary: "Beneficiary",
  },
  es: {
    title: "Pagar mi alquiler", subtitle: "Elija su método de pago y liquide su alquiler.",
    successTitle: "¡Pago registrado con éxito!", successDesc: "Su recibo se generará automáticamente.",
    methodTitle: "Método de pago",
    cardLabel: "Tarjeta / Apple Pay / Google Pay", cardDesc: "Pago instantáneo según los medios disponibles en su dispositivo.",
    sepaLabel: "Domiciliación SEPA", sepaDesc: "Sus datos bancarios se guardan para futuras domiciliaciones.",
    transferLabel: "Transferencia bancaria", transferDesc: "Transferencia manual a la cuenta del arrendador.",
    transferInfo: "Datos para la transferencia", transferHelp: "Contacte con su arrendador para obtener el IBAN:",
    transferRef: "Indique su nombre y el período como referencia de la transferencia.",
    noProperty: "Ningún inmueble vinculado a su cuenta.", upToDate: "¡Está al día!",
    noUnpaid: "No hay alquileres pendientes de pago.", rentLine: "Alquiler", chargesLine: "Gastos",
    transferBtn: "Info transferencia", payBtn: "Pagar",
    toastSuccessTitle: "✅ ¡Pago exitoso!", toastSuccessDesc: "Su alquiler ha sido pagado con éxito.",
    toastCancelTitle: "Pago cancelado", toastCancelDesc: "El pago ha sido cancelado.",
    toastTransferTitle: "Transferencia bancaria", toastTransferDesc: "Realice la transferencia y notifique a su arrendador por mensajería.",
    beneficiary: "Beneficiario",
  },
  de: {
    title: "Miete bezahlen", subtitle: "Wählen Sie Ihre Zahlungsmethode und begleichen Sie Ihre Miete.",
    successTitle: "Zahlung erfolgreich registriert!", successDesc: "Ihre Quittung wird automatisch erstellt.",
    methodTitle: "Zahlungsmethode",
    cardLabel: "Karte / Apple Pay / Google Pay", cardDesc: "Sofortige Zahlung je nach verfügbaren Methoden auf Ihrem Gerät.",
    sepaLabel: "SEPA-Lastschrift", sepaDesc: "Ihre Bankdaten werden für zukünftige Lastschriften gespeichert.",
    transferLabel: "Banküberweisung", transferDesc: "Manuelle Überweisung auf das Vermieterkonto.",
    transferInfo: "Überweisungsdaten", transferHelp: "Kontaktieren Sie Ihren Vermieter für die IBAN-Daten:",
    transferRef: "Geben Sie Ihren Namen und den Mietzeitraum als Verwendungszweck an.",
    noProperty: "Keine Wohnung mit Ihrem Konto verknüpft.", upToDate: "Sie sind auf dem Laufenden!",
    noUnpaid: "Keine unbezahlten Mietforderungen.", rentLine: "Miete", chargesLine: "Nebenkosten",
    transferBtn: "Überweisungsinfo", payBtn: "Bezahlen",
    toastSuccessTitle: "✅ Zahlung erfolgreich!", toastSuccessDesc: "Ihre Miete wurde erfolgreich bezahlt.",
    toastCancelTitle: "Zahlung abgebrochen", toastCancelDesc: "Die Zahlung wurde abgebrochen.",
    toastTransferTitle: "Banküberweisung", toastTransferDesc: "Überweisen Sie den Betrag und benachrichtigen Sie Ihren Vermieter per Nachricht.",
    beneficiary: "Empfänger",
  },
  it: {
    title: "Pagare l'affitto", subtitle: "Scelga il metodo di pagamento e saldi l'affitto.",
    successTitle: "Pagamento registrato con successo!", successDesc: "La ricevuta verrà generata automaticamente.",
    methodTitle: "Metodo di pagamento",
    cardLabel: "Carta / Apple Pay / Google Pay", cardDesc: "Pagamento istantaneo in base ai metodi disponibili sul dispositivo.",
    sepaLabel: "Addebito diretto SEPA", sepaDesc: "I dati bancari vengono salvati per futuri addebiti.",
    transferLabel: "Bonifico bancario", transferDesc: "Bonifico manuale sul conto del proprietario.",
    transferInfo: "Dati per il bonifico", transferHelp: "Contatti il proprietario per ottenere l'IBAN:",
    transferRef: "Indichi il suo nome e il periodo come causale del bonifico.",
    noProperty: "Nessun immobile collegato al suo conto.", upToDate: "È in regola!",
    noUnpaid: "Nessun affitto in attesa di pagamento.", rentLine: "Affitto", chargesLine: "Spese",
    transferBtn: "Info bonifico", payBtn: "Pagare",
    toastSuccessTitle: "✅ Pagamento riuscito!", toastSuccessDesc: "Il suo affitto è stato pagato con successo.",
    toastCancelTitle: "Pagamento annullato", toastCancelDesc: "Il pagamento è stato annullato.",
    toastTransferTitle: "Bonifico bancario", toastTransferDesc: "Effettui il bonifico e avvisi il proprietario tramite messaggi.",
    beneficiary: "Beneficiario",
  },
  pt: {
    title: "Pagar a renda", subtitle: "Escolha o método de pagamento e liquide a sua renda.",
    successTitle: "Pagamento registado com sucesso!", successDesc: "O seu recibo será gerado automaticamente.",
    methodTitle: "Método de pagamento",
    cardLabel: "Cartão / Apple Pay / Google Pay", cardDesc: "Pagamento instantâneo de acordo com os meios disponíveis no seu dispositivo.",
    sepaLabel: "Débito direto SEPA", sepaDesc: "Os seus dados bancários são guardados para futuros débitos.",
    transferLabel: "Transferência bancária", transferDesc: "Transferência manual para a conta do senhorio.",
    transferInfo: "Dados para transferência", transferHelp: "Contacte o seu senhorio para obter o IBAN:",
    transferRef: "Indique o seu nome e o período como referência da transferência.",
    noProperty: "Nenhum imóvel associado à sua conta.", upToDate: "Está em dia!",
    noUnpaid: "Nenhuma renda pendente de pagamento.", rentLine: "Renda", chargesLine: "Encargos",
    transferBtn: "Info transferência", payBtn: "Pagar",
    toastSuccessTitle: "✅ Pagamento bem-sucedido!", toastSuccessDesc: "A sua renda foi paga com sucesso.",
    toastCancelTitle: "Pagamento cancelado", toastCancelDesc: "O pagamento foi cancelado.",
    toastTransferTitle: "Transferência bancária", toastTransferDesc: "Efetue a transferência e notifique o seu senhorio por mensagem.",
    beneficiary: "Beneficiário",
  },
};

const TenantPay = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { propertyCountry, fmt: fmtProp } = useTenantProperty();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [unpaidCalls, setUnpaidCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const langGroup = (() => {
    const frGroup = ["FR", "BE", "CH", "LU", "MC", "SN", "CI", "MA", "TN"];
    const esGroup = ["ES", "MX", "AR", "CL", "CO", "PE"];
    const deGroup = ["DE", "AT"];
    const itGroup = ["IT"];
    const ptGroup = ["PT", "BR"];
    if (frGroup.includes(propertyCountry)) return "fr";
    if (esGroup.includes(propertyCountry)) return "es";
    if (deGroup.includes(propertyCountry)) return "de";
    if (itGroup.includes(propertyCountry)) return "it";
    if (ptGroup.includes(propertyCountry)) return "pt";
    return "en";
  })();
  const C = COPY_BY_LANG[langGroup] || COPY_BY_LANG.en;

  const PAYMENT_METHODS = [
    { id: "card" as const, label: C.cardLabel, icon: CreditCard, description: C.cardDesc },
    { id: "sepa" as const, label: C.sepaLabel, icon: Banknote, description: C.sepaDesc },
    { id: "bank_transfer" as const, label: C.transferLabel, icon: Building, description: C.transferDesc },
  ];

  // Handle payment return
  useEffect(() => {
    const payment = searchParams.get("payment");
    const rentCallId = searchParams.get("rent_call_id");
    if (payment === "success") {
      setPaymentSuccess(true);
      toast({ title: C.toastSuccessTitle, description: C.toastSuccessDesc });
      if (rentCallId) {
        setUnpaidCalls((prev) => prev.filter((c) => c.id !== rentCallId));
      }
    } else if (payment === "cancel") {
      toast({ title: C.toastCancelTitle, description: C.toastCancelDesc, variant: "destructive" });
    }
  }, [searchParams, C, toast]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id, property_id, rent_amount, charges_amount, properties(label)")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();

      if (!tenant) {
        setLoading(false);
        return;
      }

      setTenantInfo(tenant);

      const { data: org } = await supabase
        .from("orgs")
        .select("name, email, phone")
        .eq("id", tenant.org_id)
        .single();
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
      toast({ title: C.toastTransferTitle, description: C.toastTransferDesc });
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
      toast({ title: C.error || "Error", description: err.message, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  const fmt = (n: number) => fmtProp(n);

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{C.title}</h1>
        <p className="text-muted-foreground mb-6">{C.subtitle}</p>

        {paymentSuccess && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{C.successTitle}</p>
              <p className="text-xs text-muted-foreground">{C.successDesc}</p>
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-foreground mb-3">{C.methodTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setMethod(pm.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  method === pm.id ? "border-accent bg-accent/5 shadow-sm" : "border-border hover:border-accent/40"
                }`}
              >
                <pm.icon className={`h-6 w-6 ${method === pm.id ? "text-accent" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium text-foreground">{pm.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{pm.description}</p>
              </button>
            ))}
          </div>
        </div>

        {method === "bank_transfer" && orgInfo && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">{C.transferInfo}</h3>
            <p className="text-sm text-muted-foreground">
              {C.beneficiary} : <span className="font-medium text-foreground">{orgInfo.name}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">{C.transferHelp}</p>
            {orgInfo.email && <p className="text-sm text-accent mt-1">{orgInfo.email}</p>}
            {orgInfo.phone && <p className="text-sm text-muted-foreground">{orgInfo.phone}</p>}
            <p className="text-xs text-muted-foreground mt-3">{C.transferRef}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !tenantInfo ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Home className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{C.noProperty}</p>
          </div>
        ) : unpaidCalls.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <CheckCircle className="h-10 w-10 text-accent/30 mx-auto mb-3" />
            <p className="text-foreground font-medium">{C.upToDate}</p>
            <p className="text-sm text-muted-foreground mt-1">{C.noUnpaid}</p>
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
                    {C.rentLine} {fmt(call.rent_amount)} + {C.chargesLine} {fmt(call.charges_amount)}
                  </p>
                  <p className="text-lg font-bold text-foreground mt-1">{fmt(call.total_amount)}</p>
                </div>
                <button
                  onClick={() => handlePay(call.id)}
                  disabled={payingId === call.id}
                  className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  {payingId === call.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {method === "bank_transfer" ? C.transferBtn : C.payBtn}
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
