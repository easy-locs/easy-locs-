/**
 * CommPaymentsSection — Orbit Wallet.
 * Full wallet experience: balance, send, request, transaction history.
 * Native to Orbit's communication-first architecture.
 */
import { useState, useMemo } from "react";
import { Wallet, Plus, Search, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, Send, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useWallet, type WalletTransaction } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

type TxFilter = "all" | "in" | "out" | "pending";
type ModalMode = null | "send" | "request";

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  completed: { color: "hsl(var(--hud-success))", label: "Completed" },
  pending:   { color: "hsl(var(--hud-warning))", label: "Pending" },
  failed:    { color: "hsl(var(--hud-danger))", label: "Failed" },
  cancelled: { color: "hsl(var(--hud-text-dim) / 0.4)", label: "Cancelled" },
};

export default function CommPaymentsSection() {
  const { user } = useAuth();
  const { balance, transactions, loading, requestMoney } = useWallet();
  const [filter, setFilter] = useState<TxFilter>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState({ name: "", email: "", amount: "", currency: "EUR", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filter === "in" && tx.direction !== "in") return false;
      if (filter === "out" && tx.direction !== "out") return false;
      if (filter === "pending" && tx.status !== "pending") return false;
      if (search) {
        const q = search.toLowerCase();
        return (tx.description || "").toLowerCase().includes(q) ||
          tx.amount.toString().includes(q);
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

  const handleSubmit = async () => {
    if (!form.amount || !form.name) return;
    setSubmitting(true);

    if (modal === "request") {
      const res = await requestMoney({
        fromEmail: form.email || undefined,
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description || `Request from ${form.name}`,
      });
      if (res.success) {
        toast.success("Payment request sent");
        haptic("success");
      } else {
        toast.error(res.error || "Failed");
      }
    } else if (modal === "send") {
      // Send money — for now creates a pending outgoing transaction
      // Full P2P transfer requires recipient wallet resolution
      toast.info("P2P transfers will be available when wallet funding is enabled");
      haptic("selection");
    }

    setSubmitting(false);
    setModal(null);
    setForm({ name: "", email: "", amount: "", currency: "EUR", description: "" });
  };

  const renderTxIcon = (tx: WalletTransaction) => {
    if (tx.status === "pending") return <Clock className="h-4 w-4" style={{ color: STATUS_STYLE.pending.color }} />;
    if (tx.direction === "in") return <ArrowDownLeft className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />;
    return <ArrowUpRight className="h-4 w-4" style={{ color: "hsl(var(--hud-danger))" }} />;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* ── Wallet Balance Card ── */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)",
          }}
        >
          {/* Decorative circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
            style={{ background: "hsl(var(--primary-foreground))" }} />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4" style={{ color: "hsl(var(--primary-foreground) / 0.7)" }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}>
                Orbit Wallet
              </span>
            </div>
            <div className="text-3xl font-bold tracking-tight" style={{ color: "hsl(var(--primary-foreground))" }}>
              {loading ? "—" : `${(balance?.balance ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
            </div>
            {(balance?.frozen_balance ?? 0) > 0 && (
              <div className="text-xs mt-1" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
                {balance!.frozen_balance.toLocaleString()} € frozen
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                className="flex-1 gap-1.5 h-9 text-xs font-semibold rounded-xl"
                style={{ background: "hsl(var(--primary-foreground) / 0.15)", color: "hsl(var(--primary-foreground))" }}
                onClick={() => { haptic("selection"); setModal("send"); }}
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5 h-9 text-xs font-semibold rounded-xl"
                style={{ background: "hsl(var(--primary-foreground) / 0.15)", color: "hsl(var(--primary-foreground))" }}
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
            { label: "Sent", value: totalOut, color: "hsl(var(--hud-danger))", icon: ArrowUpRight },
            { label: "Pending", value: pendingCount, color: "hsl(var(--hud-warning))", icon: Clock, isCount: true },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-2.5" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
              <div className="flex items-center gap-1 mb-0.5">
                <stat.icon className="h-3 w-3" style={{ color: stat.color }} />
                <span className="text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{stat.label}</span>
              </div>
              <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                {stat.isCount ? stat.value : `${stat.value.toLocaleString()} €`}
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
                {f === "in" ? "Received" : f === "out" ? "Sent" : f}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Transaction History ── */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "hsl(var(--primary) / 0.3)", borderTopColor: "hsl(var(--primary))" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Wallet className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {filter !== "all" ? `No ${filter} transactions` : "No transactions yet"}
            </p>
            <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
              Send or request money to get started
            </p>
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
                      style={{ background: isIncoming ? "hsl(var(--hud-success) / 0.1)" : "hsl(var(--hud-danger) / 0.08)" }}
                    >
                      {renderTxIcon(tx)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block" style={{ color: "hsl(var(--hud-text))" }}>
                        {tx.type === "request" ? "Payment Request" : tx.description || "Transfer"}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${style.color}15`, color: style.color }}>
                          {style.label}
                        </span>
                        <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                          {format(new Date(tx.created_at), "dd MMM HH:mm")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold" style={{
                        color: isIncoming ? "hsl(var(--hud-success))" : "hsl(var(--hud-text))"
                      }}>
                        {isIncoming ? "+" : "−"}{tx.amount.toLocaleString()} {tx.currency}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Send / Request Dialog ── */}
      <Dialog open={modal !== null} onOpenChange={open => !open && setModal(null)}>
        <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
              {modal === "send" ? <Send className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {modal === "send" ? "Send Money" : "Request Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Amount *</Label>
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
                <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                  className="mt-1 border-0"
                  style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1 border-0"
                placeholder={modal === "send" ? "e.g. Split dinner" : "e.g. Rent deposit"}
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
              />
            </div>
            <Button
              className="w-full h-11 font-semibold"
              disabled={!form.name.trim() || !form.amount || submitting}
              onClick={handleSubmit}
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {submitting ? "Processing..." : modal === "send" ? "Send Money" : "Send Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
