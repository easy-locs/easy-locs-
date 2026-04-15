import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUpRight, ArrowDownLeft, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { fetchTransactionForUser } from "@/repositories/wallet-repository";
import { typedQueries } from "@/lib/db/typed-queries";
import { useUiEngine } from "@/hooks/useUiEngine";
import { formatWalletAmount } from "@/lib/format";

const TX_TYPE_KEYS: Record<string, string> = {
  manual_transfer: "wallet.txTypeTransfer",
  payment: "wallet.txTypePayment",
  refund: "wallet.txTypeRefund",
  top_up: "wallet.txTypeTopUp",
  escrow_hold: "wallet.txTypeEscrow",
  escrow_release: "wallet.txTypeEscrowRelease",
  adjustment: "wallet.txTypeAdjustment",
  commission: "wallet.txTypeCommission",
  rent_payment: "wallet.txTypeRent",
  booking_payment: "wallet.txTypeBooking",
};

interface TxDetail {
  id: string;
  created_at: string;
  sender_id: string | null;
  recipient_id: string | null;
  amount: number;
  currency: string;
  context_type: string;
  context_id: string | null;
  title: string | null;
  subtitle: string | null;
  status: string;
  metadata: Record<string, any>;
  reference_code: string | null;
}

export default function WalletTransactionDetailPage() {
  useUiEngine("wallet-wallettransactiondetailpage");
  const navigate = useNavigate();
  const { txId } = useParams<{ txId: string }>();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [tx, setTx] = useState<TxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [senderName, setSenderName] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!txId || !user?.id) return;
    setLoading(true);
    fetchTransactionForUser(txId, user.id)
      .then((data) => {
        setTx(data as TxDetail | null);
        setLoading(false);
        if (data) {
          const ids = [data.sender_id as string, data.recipient_id as string].filter(Boolean);
          if (ids.length > 0) {
            typedQueries.profiles.selectById(ids).then(({ data: profiles }) => {
              for (const p of profiles || []) {
                if (p.id === data.sender_id) setSenderName(p.name || `EL-${p.id.replace(/-/g, "").substring(0, 8).toUpperCase()}`);
                if (p.id === data.recipient_id) setRecipientName(p.name || `EL-${p.id.replace(/-/g, "").substring(0, 8).toUpperCase()}`);
              }
            });
          }
        }
      })
      .catch(() => setLoading(false));
  }, [txId, user?.id]);

  const copyRef = () => {
    if (!tx?.reference_code) return;
    navigator.clipboard.writeText(tx.reference_code);
    setCopied(true);
    toast.success(t("wallet.referenceCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel = (s: string) => {
    if (s === "completed") return t("wallet.txCompleted");
    if (s === "pending") return t("wallet.txPending");
    if (s === "failed") return t("wallet.txFailed");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  if (loading) {
    return (
      <SubPageShell title={t("wallet.txDetails")} onBack={() => navigate(-1)} noContentPad>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </SubPageShell>
    );
  }

  if (!tx) {
    return (
      <SubPageShell title={t("wallet.txNotFound")} onBack={() => navigate(-1)} noContentPad />
    );
  }

  const isOutgoing = tx.sender_id === user?.id;
  const statusColor = tx.status === "completed" ? "hsl(142 70% 45%)" : tx.status === "pending" ? "hsl(168 72% 44%)" : "hsl(0 70% 50%)";
  const amountColor = isOutgoing ? "hsl(var(--foreground))" : "hsl(142 70% 45%)";
  const sign = isOutgoing ? "-" : "+";
  const time = new Date(tx.created_at);

  const localizeType = (ct: string) => {
    const key = TX_TYPE_KEYS[ct];
    if (key) { const v = t(key); if (v !== key) return v; }
    return ct.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const dateLocale = locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-AE" : locale === "es" ? "es-ES" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "pt" ? "pt-PT" : locale === "nl" ? "nl-NL" : locale === "pl" ? "pl-PL" : locale === "tr" ? "tr-TR" : "en-US";

  const rows: { label: string; value: string }[] = [
    { label: t("wallet.txStatus"), value: statusLabel(tx.status) },
    { label: t("wallet.txType"), value: localizeType(tx.context_type) },
    { label: t("wallet.txDate"), value: time.toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" }) },
    { label: t("wallet.txTime"), value: time.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
    ...(senderName ? [{ label: t("wallet.txFrom"), value: senderName }] : []),
    ...(recipientName ? [{ label: t("wallet.txTo"), value: recipientName }] : []),
    ...(tx.reference_code ? [{ label: t("wallet.txReference"), value: tx.reference_code }] : []),
    ...(tx.context_id ? [{ label: t("wallet.txContextId"), value: tx.context_id }] : []),
  ];

  return (
    <SubPageShell title={t("wallet.txDetails")} onBack={() => navigate(-1)} noContentPad>
      <div className="px-4 space-y-5 pb-[var(--page-bottom-pad)]">
        <div className="rounded-2xl bg-card border border-border/20 p-6 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${statusColor}15` }}>
            {isOutgoing ? <ArrowUpRight className="w-6 h-6" style={{ color: statusColor }} /> : <ArrowDownLeft className="w-6 h-6" style={{ color: statusColor }} />}
          </div>
          <p className="text-3xl font-extrabold tabular-nums" style={{ color: amountColor }}>
            {sign}{formatWalletAmount(tx.amount, tx.currency)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{tx.title || localizeType(tx.context_type)}</p>
          {tx.subtitle && <p className="text-xs text-muted-foreground/60 mt-0.5">{tx.subtitle}</p>}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${statusColor}15`, color: statusColor }}>
            {statusLabel(tx.status)}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/20 overflow-hidden">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/10 last:border-0">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-xs font-semibold text-foreground text-right max-w-[60%] truncate">{row.value}</span>
            </div>
          ))}
        </div>

        {tx.reference_code && (
          <button onClick={copyRef} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-muted py-3 text-sm font-semibold active:scale-[0.98] transition-transform">
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? t("wallet.copied") : t("wallet.copyReference")}
          </button>
        )}

        {tx.metadata && Object.keys(tx.metadata).length > 0 && (
          <div className="rounded-2xl bg-card border border-border/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{t("wallet.txMetadata")}</p>
            <div className="space-y-1.5">
              {Object.entries(tx.metadata).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground/70 shrink-0">{key}</span>
                  <span className="text-[11px] text-muted-foreground font-mono text-right break-words">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
