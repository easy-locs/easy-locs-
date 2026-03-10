import { useState } from "react";
import { Banknote, Building, Copy, Check, Loader2, ExternalLink, Shield, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface OwnerBankInfo {
  full_name: string;
  bank_iban: string | null;
  bank_bic: string | null;
  bank_name: string | null;
}

interface SepaPaymentFlowProps {
  rentCall: {
    id: string;
    month: string;
    total_amount: number;
    rent_amount: number;
    charges_amount: number;
  };
  ownerBank: OwnerBankInfo | null;
  hasStripeConnect: boolean;
  fmt: (n: number) => string;
  onPayStripe: (rentCallId: string) => Promise<void>;
  payingId: string | null;
  paymentReference: string;
}

export default function SepaPaymentFlow({
  rentCall, ownerBank, hasStripeConnect, fmt, onPayStripe, payingId, paymentReference,
}: SepaPaymentFlowProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"choose" | "stripe" | "manual">("choose");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyBtn = ({ value, field, label }: { value: string; field: string; label: string }) => (
    <button
      onClick={() => copyToClipboard(value, field)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors"
    >
      {copiedField === field ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      {copiedField === field ? (t("common.copied") || "Copié") : label}
    </button>
  );

  if (mode === "choose") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground mb-2">
          {t("sepa.choose_method") || "Choisissez votre mode de paiement SEPA :"}
        </p>

        {hasStripeConnect && (
          <button
            onClick={() => setMode("stripe")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-accent/40 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Banknote className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t("sepa.direct_debit") || "Automatic SEPA Direct Debit"}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("sepa.direct_debit_desc") || "Enter your IBAN — secure payment via Stripe"}
              </p>
            </div>
            <Shield className="h-4 w-4 text-accent shrink-0" />
          </button>
        )}

        {ownerBank?.bank_iban && (
          <button
            onClick={() => setMode("manual")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-accent/40 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Building className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t("sepa.manual_transfer") || "Manual bank transfer"}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("sepa.manual_transfer_desc") || "Make a transfer from your bank"}
              </p>
            </div>
          </button>
        )}

        {!hasStripeConnect && !ownerBank?.bank_iban && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {t("sepa.not_configured") || "Le paiement SEPA n'est pas encore configuré par votre bailleur. Contactez-le pour plus d'informations."}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (mode === "stripe") {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-foreground">
          ← {t("common.back") || "Retour"}
        </button>

        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("sepa.stripe_title") || "Prélèvement SEPA sécurisé"}
            </h3>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            {t("sepa.stripe_desc") || "Vous serez redirigé vers notre page de paiement sécurisé Stripe pour saisir votre IBAN et autoriser le prélèvement. Le mandat SEPA sera enregistré pour les paiements futurs."}
          </p>

          <div className="bg-background rounded-lg p-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("page.tenant_pay.rent_line") || "Loyer"}</span>
              <span className="text-foreground font-medium">{fmt(rentCall.rent_amount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">{t("page.tenant_pay.charges_line") || "Charges"}</span>
              <span className="text-foreground font-medium">{fmt(rentCall.charges_amount)}</span>
            </div>
            <div className="border-t border-border mt-2 pt-2 flex justify-between">
              <span className="font-semibold text-foreground">{t("common.total") || "Total"}</span>
              <span className="font-bold text-foreground text-lg">{fmt(rentCall.total_amount)}</span>
            </div>
          </div>

          <button
            onClick={() => onPayStripe(rentCall.id)}
            disabled={payingId === rentCall.id}
            className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {payingId === rentCall.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                {t("sepa.pay_now") || "Payer maintenant"}
              </>
            )}
          </button>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {t("sepa.mandate_notice") || "En procédant, vous acceptez le mandat de prélèvement SEPA Direct Debit."}
          </p>
        </div>
      </div>
    );
  }

  // Manual transfer mode
  return (
    <div className="space-y-4">
      <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-foreground">
        ← {t("common.back") || "Retour"}
      </button>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {t("sepa.transfer_details") || "Informations de virement"}
        </h3>

        <div className="space-y-3">
          {/* Beneficiary */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {t("sepa.beneficiary") || "Bénéficiaire"}
            </p>
            <p className="text-sm font-medium text-foreground">{ownerBank?.full_name || "—"}</p>
          </div>

          {/* IBAN */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">IBAN</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded flex-1 break-all">
                {ownerBank?.bank_iban || "—"}
              </code>
              {ownerBank?.bank_iban && (
                <CopyBtn value={ownerBank.bank_iban} field="iban" label={t("sepa.copy_iban") || "Copier IBAN"} />
              )}
            </div>
          </div>

          {/* BIC */}
          {ownerBank?.bank_bic && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">BIC / SWIFT</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded">
                  {ownerBank.bank_bic}
                </code>
                <CopyBtn value={ownerBank.bank_bic} field="bic" label={t("sepa.copy_bic") || "Copier BIC"} />
              </div>
            </div>
          )}

          {/* Bank name */}
          {ownerBank?.bank_name && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {t("sepa.bank") || "Banque"}
              </p>
              <p className="text-sm text-foreground">{ownerBank.bank_name}</p>
            </div>
          )}

          {/* Amount */}
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {t("sepa.exact_amount") || "Montant exact à virer"}
            </p>
            <p className="text-xl font-bold text-foreground">{fmt(rentCall.total_amount)}</p>
          </div>

          {/* Reference */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {t("sepa.reference") || "Référence de paiement (obligatoire)"}
            </p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-foreground bg-accent/10 border border-accent/20 px-3 py-1.5 rounded font-bold flex-1">
                {paymentReference}
              </code>
              <CopyBtn value={paymentReference} field="ref" label={t("sepa.copy_ref") || "Copier réf."} />
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            ⚠️ {t("sepa.manual_notice") || "Indiquez impérativement la référence ci-dessus dans le libellé de votre virement. Votre bailleur sera notifié automatiquement dès réception du paiement."}
          </p>
        </div>
      </div>
    </div>
  );
}
