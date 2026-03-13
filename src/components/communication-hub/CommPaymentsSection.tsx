/**
 * CommPaymentsSection — Real payment requests module.
 * Manages payment requests, statuses, and history within the communication hub.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, Plus, Search, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

type PaymentFilter = "all" | "pending" | "paid" | "failed";

interface PaymentRequest {
  id: string;
  org_id: string;
  sender_id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  context_type: string;
  stripe_payment_link: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "hsl(45, 90%, 55%)", label: "Pending" },
  paid: { icon: CheckCircle2, color: "hsl(142, 70%, 50%)", label: "Paid" },
  failed: { icon: XCircle, color: "hsl(0, 70%, 60%)", label: "Failed" },
  refunded: { icon: RefreshCw, color: "hsl(220, 70%, 60%)", label: "Refunded" },
  cancelled: { icon: XCircle, color: "hsl(var(--hud-text-dim) / 0.4)", label: "Cancelled" },
};

export default function CommPaymentsSection() {
  const { user, orgId } = useAuth();
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newPayment, setNewPayment] = useState({ recipientName: "", recipientEmail: "", amount: "", currency: "EUR", description: "" });
  const [creating, setCreating] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);
    setPayments((data as PaymentRequest[]) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const filtered = payments.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.recipient_name || "").toLowerCase().includes(q) ||
        (p.recipient_email || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalReceived = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  const handleCreate = async () => {
    if (!user?.id || !orgId || !newPayment.amount || !newPayment.recipientName) return;
    setCreating(true);
    const { error } = await supabase.from("payment_requests").insert({
      org_id: orgId,
      sender_id: user.id,
      recipient_name: newPayment.recipientName.trim(),
      recipient_email: newPayment.recipientEmail.trim() || null,
      amount: parseFloat(newPayment.amount),
      currency: newPayment.currency,
      description: newPayment.description.trim() || null,
    } as any);
    setCreating(false);
    if (error) { toast.error("Failed to create payment request"); return; }
    toast.success("Payment request created");
    haptic("success");
    setShowCreate(false);
    setNewPayment({ recipientName: "", recipientEmail: "", amount: "", currency: "EUR", description: "" });
    loadPayments();
  };

  const filters: { id: PaymentFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "paid", label: "Paid" },
    { id: "failed", label: "Failed" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>Payments</h2>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs"
            style={{ color: "hsl(var(--hud-cyan))" }}
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Request
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3 w-3" style={{ color: "hsl(45, 90%, 55%)" }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Pending</span>
            </div>
            <span className="text-base font-bold" style={{ color: "hsl(var(--hud-text))" }}>
              {totalPending.toLocaleString()} €
            </span>
          </div>
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-3 w-3" style={{ color: "hsl(142, 70%, 50%)" }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Received</span>
            </div>
            <span className="text-base font-bold" style={{ color: "hsl(var(--hud-text))" }}>
              {totalReceived.toLocaleString()} €
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search payments..."
            className="pl-9 h-9 text-sm border-0"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => { haptic("selection"); setFilter(f.id); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === f.id ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface) / 0.5)",
                color: filter === f.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.6)",
                border: `1px solid ${filter === f.id ? "hsl(var(--hud-cyan) / 0.2)" : "transparent"}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "hsl(var(--hud-cyan) / 0.3)", borderTopColor: "hsl(var(--hud-cyan))" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <CreditCard className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {filter !== "all" ? `No ${filter} payments` : "No payment requests yet"}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 gap-1.5"
              style={{ color: "hsl(var(--hud-cyan))" }}
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              Create first request
            </Button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filtered.map(payment => {
              const statusConf = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConf.icon;
              const isSender = payment.sender_id === user?.id;
              return (
                <div
                  key={payment.id}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-[hsl(var(--hud-surface)/0.3)] transition-colors"
                >
                  {/* Direction icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${statusConf.color}15` }}
                  >
                    {isSender ? (
                      <ArrowUpRight className="h-4 w-4" style={{ color: statusConf.color }} />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" style={{ color: statusConf.color }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: "hsl(var(--hud-text))" }}>
                        {payment.recipient_name || payment.recipient_email || "Payment"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusIcon className="h-3 w-3" style={{ color: statusConf.color }} />
                      <span className="text-[11px]" style={{ color: statusConf.color }}>
                        {statusConf.label}
                      </span>
                      {payment.description && (
                        <span className="text-[11px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                          · {payment.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + time */}
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                      {payment.amount.toLocaleString()} {payment.currency}
                    </span>
                    <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {format(new Date(payment.created_at), "dd/MM HH:mm")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Payment Request Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>New Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Recipient Name *</Label>
              <Input
                value={newPayment.recipientName}
                onChange={e => setNewPayment(p => ({ ...p, recipientName: e.target.value }))}
                className="mt-1 border-0"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Email</Label>
              <Input
                value={newPayment.recipientEmail}
                onChange={e => setNewPayment(p => ({ ...p, recipientEmail: e.target.value }))}
                className="mt-1 border-0"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Amount *</Label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                  className="mt-1 border-0"
                  style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                />
              </div>
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Currency</Label>
                <Input
                  value={newPayment.currency}
                  onChange={e => setNewPayment(p => ({ ...p, currency: e.target.value }))}
                  className="mt-1 border-0"
                  style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
              <Input
                value={newPayment.description}
                onChange={e => setNewPayment(p => ({ ...p, description: e.target.value }))}
                className="mt-1 border-0"
                placeholder="e.g. Deposit for apartment rental"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
              />
            </div>
            <Button
              className="w-full"
              disabled={!newPayment.recipientName.trim() || !newPayment.amount || creating}
              onClick={handleCreate}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
            >
              {creating ? "Creating..." : "Send Payment Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
