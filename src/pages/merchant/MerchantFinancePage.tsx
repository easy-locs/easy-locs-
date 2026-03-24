/**
 * MerchantFinancePage — Premium merchant payments/wallet/transactions hub.
 * Full ledger, KPIs, filters, transaction detail drawer.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Shield, Filter,
  ArrowDownLeft, ArrowUpRight, RotateCcw, Lock, Unlock, CreditCard,
  Zap, Receipt, ChevronRight, X, CheckCircle2, XCircle, AlertCircle,
  Download, Calendar, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type TxType = "credit" | "debit" | "refund" | "boost" | "escrow" | "payout" | "fee" | "topup";
type TxStatus = "completed" | "pending" | "failed" | "held" | "released";
type FilterType = "all" | TxType;

interface MerchantTx {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  title: string | null;
  subtitle: string | null;
  sender_id: string | null;
  recipient_id: string | null;
  context_type: string | null;
  context_id: string | null;
  metadata: Record<string, any>;
}

const TX_CONFIG: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  credit:  { icon: ArrowDownLeft,  color: "text-emerald-500", label: "Credit" },
  debit:   { icon: ArrowUpRight,   color: "text-red-500",     label: "Debit" },
  refund:  { icon: RotateCcw,      color: "text-amber-500",   label: "Refund" },
  boost:   { icon: Zap,            color: "text-purple-500",  label: "Boost" },
  escrow:  { icon: Lock,           color: "text-blue-500",    label: "Escrow" },
  payout:  { icon: CreditCard,     color: "text-teal-500",    label: "Payout" },
  fee:     { icon: Receipt,        color: "text-orange-500",  label: "Fee" },
  topup:   { icon: TrendingUp,     color: "text-emerald-500", label: "Top-up" },
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credits" },
  { key: "debit", label: "Debits" },
  { key: "refund", label: "Refunds" },
  { key: "escrow", label: "Escrow" },
  { key: "boost", label: "Boosts" },
  { key: "fee", label: "Fees" },
  { key: "payout", label: "Payouts" },
];

function classifyTx(tx: MerchantTx, userId: string): TxType {
  // Use context_type + title since unified_wallet_transactions has no transaction_type column
  const ctx = (tx.context_type || "").toLowerCase();
  const title = (tx.title || "").toLowerCase();
  const combined = `${ctx} ${title}`;
  if (combined.includes("refund")) return "refund";
  if (combined.includes("boost")) return "boost";
  if (combined.includes("escrow")) return "escrow";
  if (combined.includes("payout")) return "payout";
  if (combined.includes("fee") || combined.includes("commission")) return "fee";
  if (combined.includes("topup") || combined.includes("top_up") || combined.includes("top up")) return "topup";
  if (tx.recipient_id === userId) return "credit";
  return "debit";
}

function KpiCard({ label, value, icon: Icon, color, trend }: {
  label: string; value: string; icon: typeof TrendingUp; color: string; trend?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/20 bg-card p-4 min-w-0"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", `bg-${color}/10`)}>
          <Icon className={cn("w-4.5 h-4.5", `text-${color}`)} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-500">{trend}</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground font-medium truncate">{label}</p>
      <p className="text-lg font-black text-foreground tabular-nums truncate">{value}</p>
    </motion.div>
  );
}

function TxDetailDrawer({ tx, userId, currency, onClose }: {
  tx: MerchantTx; userId: string; currency: string; onClose: () => void;
}) {
  const type = classifyTx(tx, userId);
  const config = TX_CONFIG[type] || TX_CONFIG.credit;
  const Icon = config.icon;
  const isCredit = ["credit", "topup", "payout"].includes(type);
  const feeRate = 0.05;
  const gross = tx.amount;
  const fees = type === "credit" ? gross * feeRate : 0;
  const net = isCredit ? gross - fees : gross;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-md bg-card rounded-t-3xl border-t border-border/20 p-5 pb-[calc(24px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-muted/60")}>
            <Icon className={cn("w-6 h-6", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground">{tx.title || config.label}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(tx.created_at).toLocaleString(undefined, {
                weekday: "short", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount breakdown */}
        <div className="rounded-2xl bg-muted/30 border border-border/10 p-4 space-y-3 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gross amount</span>
            <span className="font-bold tabular-nums">{formatMoney(gross, currency)}</span>
          </div>
          {fees > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform fee (5%)</span>
              <span className="font-bold text-orange-500 tabular-nums">-{formatMoney(fees, currency)}</span>
            </div>
          )}
          <div className="border-t border-border/20 pt-3 flex justify-between text-sm">
            <span className="font-semibold text-foreground">Net amount</span>
            <span className={cn("font-black text-base tabular-nums", isCredit ? "text-emerald-500" : "text-red-500")}>
              {isCredit ? "+" : "-"}{formatMoney(net, currency)}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2.5 text-sm">
          <DetailRow label="Type" value={config.label} />
          <DetailRow label="Status" value={tx.status} />
          <DetailRow label="Currency" value={tx.currency} />
          <DetailRow label="Transaction ID" value={tx.id.slice(0, 12) + "..."} />
          {tx.context_type && <DetailRow label="Context" value={tx.context_type} />}
          {tx.metadata?.order_id && <DetailRow label="Order" value={tx.metadata.order_id.slice(0, 12)} />}
          {tx.metadata?.payment_method && <DetailRow label="Payment method" value={tx.metadata.payment_method} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground capitalize">{value}</span>
    </div>
  );
}

export default function MerchantFinancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<MerchantTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTx, setSelectedTx] = useState<MerchantTx | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const currency = "AED";

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("unified_wallet_transactions")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    setTransactions((data as MerchantTx[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (!user?.id) return { available: 0, pending: 0, escrow: 0, todayIn: 0, todayOut: 0, weekTotal: 0, monthTotal: 0 };
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1);

    let available = 0, pending = 0, escrow = 0, todayIn = 0, todayOut = 0, weekTotal = 0, monthTotal = 0;

    for (const tx of transactions) {
      const type = classifyTx(tx, user.id);
      const isCredit = tx.recipient_id === user.id;
      const d = new Date(tx.created_at);

      if (tx.status === "completed" && isCredit) available += tx.amount;
      if (tx.status === "completed" && !isCredit) available -= tx.amount;
      if (tx.status === "pending") pending += tx.amount;
      if (type === "escrow" && tx.status !== "released") escrow += tx.amount;

      if (d >= todayStart) {
        if (isCredit) todayIn += tx.amount; else todayOut += tx.amount;
      }
      if (d >= weekStart && isCredit && tx.status === "completed") weekTotal += tx.amount;
      if (d >= monthStart && isCredit && tx.status === "completed") monthTotal += tx.amount;
    }
    return { available, pending, escrow, todayIn, todayOut, weekTotal, monthTotal };
  }, [transactions, user?.id]);

  // Filtered transactions
  const filtered = useMemo(() => {
    if (!user?.id) return [];
    let list = transactions;
    if (filter !== "all") {
      list = list.filter(tx => classifyTx(tx, user.id) === filter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(tx =>
        (tx.title || "").toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q) ||
        (tx.metadata?.order_id || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filter, searchQuery, user?.id]);

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    if (status === "held") return <Lock className="w-3.5 h-3.5 text-blue-500" />;
    return <Clock className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-[calc(90px+env(safe-area-inset-bottom))] space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Payments & Finance</h1>
          <p className="text-[11px] text-muted-foreground">Merchant ledger & analytics</p>
        </div>
        <button className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
          <Download className="w-4.5 h-4.5 text-muted-foreground" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <KpiCard label="Available Balance" value={formatMoney(kpis.available, currency)} icon={Shield} color="emerald-500" />
        <KpiCard label="Pending" value={formatMoney(kpis.pending, currency)} icon={Clock} color="amber-500" />
        <KpiCard label="Escrow Held" value={formatMoney(kpis.escrow, currency)} icon={Lock} color="blue-500" />
        <KpiCard label="Today Credits" value={formatMoney(kpis.todayIn, currency)} icon={TrendingUp} color="emerald-500" />
      </div>

      {/* Weekly / Monthly strip */}
      <div className="flex gap-2.5">
        <div className="flex-1 rounded-2xl border border-border/20 bg-card p-3.5">
          <p className="text-[10px] text-muted-foreground font-medium">This Week</p>
          <p className="text-base font-black text-foreground tabular-nums">{formatMoney(kpis.weekTotal, currency)}</p>
        </div>
        <div className="flex-1 rounded-2xl border border-border/20 bg-card p-3.5">
          <p className="text-[10px] text-muted-foreground font-medium">This Month</p>
          <p className="text-base font-black text-foreground tabular-nums">{formatMoney(kpis.monthTotal, currency)}</p>
        </div>
        <div className="flex-1 rounded-2xl border border-border/20 bg-card p-3.5">
          <p className="text-[10px] text-muted-foreground font-medium">Today Debits</p>
          <p className="text-base font-black text-red-500 tabular-nums">{formatMoney(kpis.todayOut, currency)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-border/20 bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction Ledger */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-foreground">Transaction Ledger</h3>
          <span className="text-[10px] text-muted-foreground">{filtered.length} transactions</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No transactions found
          </div>
        ) : (
          <motion.div className="space-y-1.5" initial="hidden" animate="visible" variants={{
            visible: { transition: { staggerChildren: 0.03 } }
          }}>
            {filtered.map((tx) => {
              const type = classifyTx(tx, user!.id);
              const config = TX_CONFIG[type] || TX_CONFIG.credit;
              const TxIcon = config.icon;
              const isCredit = ["credit", "topup"].includes(type);

              return (
                <motion.button
                  key={tx.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  onClick={() => setSelectedTx(tx)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/15 hover:bg-muted/30 transition-all active:scale-[0.98] text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                    <TxIcon className={cn("w-4 h-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {tx.title || config.label}
                      </p>
                      {statusIcon(tx.status)}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {new Date(tx.created_at).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                      {tx.context_type && <span className="ml-1">• {tx.context_type}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-bold tabular-nums",
                      isCredit ? "text-emerald-500" : "text-foreground"
                    )}>
                      {isCredit ? "+" : "-"}{formatMoney(tx.amount, tx.currency)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedTx && (
          <TxDetailDrawer
            tx={selectedTx}
            userId={user!.id}
            currency={currency}
            onClose={() => setSelectedTx(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
