/**
 * SupportTicketForm — Create a support ticket from anywhere in the app.
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";
import { toast } from "sonner";
import { Send, X } from "lucide-react";

const TICKET_TYPES = [
  { value: "order_issue", label: "Order issue" },
  { value: "delivery_issue", label: "Delivery issue" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "refund_issue", label: "Refund request" },
  { value: "account_issue", label: "Account issue" },
  { value: "merchant_issue", label: "Merchant issue" },
  { value: "driver_issue", label: "Driver issue" },
  { value: "other", label: "Other" },
];

interface SupportTicketFormProps {
  orderId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
  defaultType?: string;
}

export default function SupportTicketForm({ orderId, onClose, onSuccess, defaultType }: SupportTicketFormProps) {
  const { user } = useAuth();
  const [ticketType, setTicketType] = useState(defaultType || "order_issue");
  const [subject, setSubject] = useState(orderId ? `Issue with order ${orderId.slice(0, 8)}...` : "");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id || !subject.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await db("support_tickets").insert({
        requester_user_id: user.id,
        ticket_type: ticketType,
        subject: subject.trim(),
        context_id: orderId || null,
        context_type: orderId ? "order" : "general",
        status: "open",
      });
      if (error) throw error;
      toast.success("Support ticket created");
      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      console.error("Support ticket error:", err);
      toast.error("Could not create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Report an issue</h3>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Issue type</label>
          <select
            value={ticketType}
            onChange={e => setTicketType(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm bg-background border border-border/20 text-foreground"
          >
            {TICKET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm bg-background border border-border/20 text-foreground"
            placeholder="Brief description..."
          />
        </div>

        <div>
          <label className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Details</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl px-3 py-2.5 text-sm bg-background border border-border/20 text-foreground resize-none"
            placeholder="Describe what happened..."
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !subject.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold bg-primary text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {submitting ? "Sending..." : "Submit ticket"}
      </button>
    </div>
  );
}
