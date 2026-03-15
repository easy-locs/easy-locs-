/**
 * CommPaymentsSection — LOCS Wallet
 * Full wallet: LOCS balance, purchase, send, request, transaction history.
 * 1 LOCS = 1 EUR | Non-refundable, non-withdrawable
 */
import { useState, useMemo, useCallback } from "react";
import {
  Wallet, Plus, Search, ArrowUpRight, ArrowDownLeft, Clock,
  Send, Download, CreditCard, TrendingUp, Shield, Coins
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useWallet, type WalletTransaction } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { PURCHASE_CURRENCIES, LOCS_CONFIG, formatLocs } from "@/lib/locs-wallet";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

type TxFilter = "all" | "in" | "out" | "pending";
type ModalMode = null | "send" | "request" | "buy";

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  completed: { color: "hsl(var(--hud-success))", label: "Completed" },
  pending:   { color: "hsl(var(--hud-warning))", label: "Pending" },
  failed:    { color: "hsl(var(--hud-danger))", label: "Failed" },
  cancelled: { color: "hsl(var(--hud-text-dim) / 0.4)", label: "Cancelled" },
};

export default function CommPaymentsSection() {
  const { user } = useAuth();
  const { balance, transactions, loading, requestMoney, purchaseLocs, getConversionPreview } = useWallet();
  const [filter, setFilter] = useState<TxFilter>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState({ name: "", email: "", amount: "", currency: "EUR", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [conversionPreview, setConversionPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filter === "in" && tx.direction !== "in") return false;
      if (filter === "out" && tx.direction !== "out") return false;
      if (filter === "pending" && tx.status !== "pending") return false;
      if (search) {
        const q = search.toLowerCase();
        return (tx.description || "").toLowerCase().includes(q) || tx.amount.toString().includes(q);
      }
      return true;
    });
  }, [transactions, filter, search]);

  const totalIn = useMemo(() =>
    transactions.filter(t => t.direction === "in" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalOut = useMemo(() =>
    transactions.filter(t => t.direction === "out" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const pendingCount = transactions.filter(t => t.status === "pending").length;

  const handleConversionPreview = useCallback(async (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (!num || num <= 0 || currency === "LOCS") {
      setConversionPreview(null);
      return;
    }
    setPreviewLoading(true);
    const preview = await getConversionPreview(num, currency);
    setConversionPreview(preview);
    setPreviewLoading(false);
  }, [getConversionPreview]);

  const handleSubmit = async () => {
    if (!form.amount || (modal !== "buy" && !form.name)) return;
    setSubmitting(true);

    if (modal === "buy") {
      const res = await purchaseLocs(parseFloat(form.amount), form.currency);
      if (res.success) {
        toast.success(`Checkout opened — ${res.locsPreview} LOCS will be credited`);
        haptic("success");
      } else {
        toast.error(res.error || "Purchase failed");
      }
    } else if (modal === "request") {
      const res = await requestMoney({
        fromEmail: form.email || undefined,
        amount: parseFloat(form.amount),
        description: form.description || `Request from ${form.name}`,
      });
      if (res.success) {
        toast.success("LOCS request sent");
        haptic("success");
      } else {
        toast.error(res.error || "Failed");
      }
    } else if (modal === "send") {
      toast.info("P2P LOCS transfers will be available soon");
      haptic("selection");
    }

    setSubmitting(false);
    setModal(null);
    setForm({ name: "", email: "", amount: "", currency: "EUR", description: "" });
    setConversionPreview(null);
  };

  const renderTxIcon = (tx: WalletTransaction) => {
    if (tx.type === "purchase") return <CreditCard className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />;
    if (tx.status === "pending") return <Clock className="h-4 w-4" style={{ color: STATUS_STYLE.pending.color }} />;
    if (tx.direction === "in") return <ArrowDownLeft className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />;
    return <ArrowUpRight className="h-4 w-4" style={{ color: "hsl(var(--hud-danger))" }} />;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* ── LOCS Balance Card ── */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent) / 0.8) 100%)",
          }}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
            style={{ background: "hsl(var(--primary-foreground))" }} />
          <div className="absolute top-3 right-4">
            <Shield className="h-4 w-4" style={{ color: "hsl(var(--primary-foreground) / 0.3)" }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4" style={{ color: "hsl(var(--primary-foreground) / 0.7)" }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}>
                LOCS Wallet
              </span>
            </div>
            <div className="text-3xl font-bold tracking-tight" style={{ color: "hsl(var(--primary-foreground))" }}>
              {loading ? "—" : formatLocs(balance?.balance ?? 0)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>
              1 LOCS = 1 EUR • Platform credits
            </div>
            {(balance?.frozen_balance ?? 0) > 0 && (
              <div className="text-xs mt-1" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
                {formatLocs(balance!.frozen_balance)} frozen
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                className="flex-1 gap-1.5 h-9 text-xs font-semibold rounded-xl"
                style={{ background: "hsl(var(--primary-foreground) / 0.2)", color: "hsl(var(--primary-foreground))" }}
                onClick={() => { haptic("selection"); setModal("buy"); }}
              >
                <Plus className="h-3.5 w-3.5" />
                Buy LOCS
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5 h-9 text-xs font-semibold rounded-xl"
                style={{ background: "hsl(var(--primary-foreground) / 0.12)", color: "hsl(var(--primary-foreground))" }}
                onClick={() => { haptic("selection"); setModal("send"); }}
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5 h-9 text-xs font-semibold rounded-xl"
                style={{ background: "hsl(var(--primary-foreground) / 0.12)", color: "hsl(var(--primary-foreground))" }}
                onClick={() => { haptic("selection"); setModal("request"); }}
              >
                <Download className="h-3.5 w-3.5" />
                Request
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Received", value: totalIn, color: "hsl(var(--hud-success))", icon: ArrowDownLeft },
            { label: "Spent", value: totalOut, color: "hsl(var(--hud-danger))", icon: ArrowUpRight },
            { label: "Pending", value: pendingCount, color: "hsl(var(--hud-warning))", icon: Clock, isCount: true },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-2.5" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
              <div className="flex items-center gap-1 mb-0.5">
                <stat.icon className="h-3 w-3" style={{ color: stat.color }} />
                <span className="text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{stat.label}</span>
              </div>
              <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                {stat.isCount ? stat.value : formatLocs(stat.value as number)}
              </span>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="pl-9 h-9 text-sm border-0"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
          />
        </div>

        <Tabs value={filter} onValueChange={v => setFilter(v as TxFilter)}>
          <TabsList className="w-full h-8 p-0.5" style={{ background: "hsl(var(--hud-surface) / 0.5)" }}>
            {(["all", "in", "out", "pending"] as TxFilter[]).map(f => (
              <TabsTrigger key={f} value={f} className="flex-1 h-7 text-xs data-[state=active]:shadow-sm capitalize">
                {f === "in" ? "Received" : f === "out" ? "Spent" : f}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Transaction History ── */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Coins className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {filter !== "all" ? `No ${filter} transactions` : "No transactions yet"}
            </p>
            <p className="text-xs mb-4" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
              Buy LOCS credits to get started
            </p>
            <Button
              size="sm"
              className="gap-1.5"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              onClick={() => setModal("buy")}
            >
              <Plus className="h-3.5 w-3.5" /> Buy LOCS
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
              {filtered.map((tx, i) => {
                const style = STATUS_STYLE[tx.status] || STATUS_STYLE.completed;
                const isIncoming = tx.direction === "in";
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-[hsl(var(--hud-surface)/0.3)] transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: tx.type === "purchase" ? "hsl(var(--primary) / 0.1)" : isIncoming ? "hsl(var(--hud-success) / 0.1)" : "hsl(var(--hud-danger) / 0.08)" }}
                    >
                      {renderTxIcon(tx)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block" style={{ color: "hsl(var(--hud-text))" }}>
                        {tx.type === "purchase" ? "LOCS Purchase" : tx.type === "request" ? "LOCS Request" : tx.description || "LOCS Transfer"}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${style.color}15`, color: style.color }}>
                          {style.label}
                        </span>
                        <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                          {format(new Date(tx.created_at), "dd MMM HH:mm")}
                        </span>
                        {tx.fx_source && (
                          <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary) / 0.6)" }}>
                            FX: {tx.fx_source}
                          </span>
                        )}
                      </div>
                      {tx.original_amount && tx.original_currency && (
                        <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }}>
                          Paid {tx.original_amount} {tx.original_currency}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold" style={{
                        color: isIncoming ? "hsl(var(--hud-success))" : "hsl(var(--hud-text))"
                      }}>
                        {isIncoming ? "+" : "−"}{tx.amount.toLocaleString()} LOCS
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Buy / Send / Request Dialog ── */}
      <Dialog open={modal !== null} onOpenChange={open => !open && setModal(null)}>
        <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
              {modal === "buy" ? <CreditCard className="h-4 w-4" /> : modal === "send" ? <Send className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {modal === "buy" ? "Buy LOCS Credits" : modal === "send" ? "Send LOCS" : "Request LOCS"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {modal === "buy" ? (
              <>
                {/* Buy LOCS form */}
                <div className="rounded-xl p-3 text-center" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.1)" }}>
                  <Coins className="h-5 w-5 mx-auto mb-1" style={{ color: "hsl(var(--primary))" }} />
                  <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    1 LOCS = 1 EUR • Non-refundable
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Amount *</Label>
                    <Input
                      type="number"
                      min={LOCS_CONFIG.MIN_PURCHASE_EUR}
                      step="1"
                      value={form.amount}
                      onChange={e => {
                        setForm(f => ({ ...f, amount: e.target.value }));
                        handleConversionPreview(e.target.value, form.currency);
                      }}
                      placeholder="100"
                      className="mt-1 border-0"
                      style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Currency</Label>
                    <Select
                      value={form.currency}
                      onValueChange={v => {
                        setForm(f => ({ ...f, currency: v }));
                        handleConversionPreview(form.amount, v);
                      }}
                    >
                      <SelectTrigger className="mt-1 border-0 h-10" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PURCHASE_CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Conversion preview */}
                {conversionPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-xl p-3 space-y-1"
                    style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}
                  >
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "hsl(var(--hud-text-dim))" }}>You pay</span>
                      <span style={{ color: "hsl(var(--hud-text))" }}>{conversionPreview.original_amount} {conversionPreview.original_currency}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "hsl(var(--hud-text-dim))" }}>FX Rate</span>
                      <span style={{ color: "hsl(var(--hud-text))" }}>{conversionPreview.fx_rate_used?.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "hsl(var(--hud-text-dim))" }}>≈ EUR</span>
                      <span style={{ color: "hsl(var(--hud-text))" }}>{conversionPreview.amount_in_eur} €</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "hsl(var(--hud-text-dim))" }}>Spread ({(conversionPreview.margin_applied * 100).toFixed(0)}%)</span>
                      <span style={{ color: "hsl(var(--hud-danger) / 0.7)" }}>−{conversionPreview.spread_amount} €</span>
                    </div>
                    <div className="border-t pt-1 mt-1 flex justify-between" style={{ borderColor: "hsl(var(--hud-border) / 0.1)" }}>
                      <span className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>You receive</span>
                      <span className="text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>
                        {conversionPreview.locs_amount} LOCS
                      </span>
                    </div>
                    <div className="text-[9px] text-center mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                      Source: {conversionPreview.fx_source?.toUpperCase()} • {conversionPreview.fx_timestamp ? format(new Date(conversionPreview.fx_timestamp), "HH:mm dd/MM") : ""}
                    </div>
                  </motion.div>
                )}
                {previewLoading && (
                  <div className="text-center py-2">
                    <div className="w-4 h-4 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "hsl(var(--primary) / 0.3)", borderTopColor: "hsl(var(--primary))" }} />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Send / Request form */}
                <div>
                  <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    {modal === "send" ? "Recipient Name" : "From (Name)"} *
                  </Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1 border-0"
                    style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                  />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="mt-1 border-0"
                    style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                  />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Amount (LOCS) *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="mt-1 border-0"
                    style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                  />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
                  <Input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="mt-1 border-0"
                    placeholder={modal === "send" ? "e.g. Split dinner" : "e.g. Service payment"}
                    style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                  />
                </div>
              </>
            )}

            <Button
              className="w-full h-11 font-semibold"
              disabled={
                submitting ||
                (modal === "buy" ? !form.amount || parseFloat(form.amount) < LOCS_CONFIG.MIN_PURCHASE_EUR : !form.name.trim() || !form.amount)
              }
              onClick={handleSubmit}
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {submitting ? "Processing..." : modal === "buy" ? "Purchase LOCS" : modal === "send" ? "Send LOCS" : "Send Request"}
            </Button>

            {modal === "buy" && (
              <p className="text-[10px] text-center" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                LOCS credits are non-refundable, non-withdrawable, and usable only inside Easy-Locs.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
