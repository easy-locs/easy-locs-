/**
 * Chat Payment Action Bar
 * Appears inside Orbit conversations to enable payment actions.
 */
import React, { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  requestPaymentInChat,
  sendMoneyInChat,
} from "@/lib/orbit/orbit-payment-bridge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatPaymentBarProps {
  conversationId: string;
  senderOrbitId: string;
  recipientUserId: string;
}

export default function ChatPaymentBar({
  conversationId,
  senderOrbitId,
  recipientUserId,
}: ChatPaymentBarProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"send" | "request" | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!user?.id) {
      toast.error("Please log in");
      return;
    }

    setLoading(true);
    try {
      if (mode === "send") {
        await sendMoneyInChat({
          conversationId,
          senderOrbitId,
          senderUserId: user.id,
          recipientUserId,
          amount: numAmount,
          currency: "AED",
          note: note || undefined,
        });
      } else {
        await requestPaymentInChat({
          conversationId,
          senderUserId: user.id,
          senderOrbitId,
          recipientUserId,
          amount: numAmount,
          currency: "AED",
          note: note || undefined,
        });
      }
      setAmount("");
      setNote("");
      setMode(null);
      setExpanded(false);
    } catch (e) {
      toast.error("Payment action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 pb-1">
      <AnimatePresence>
        {!expanded && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex gap-2"
          >
            <button
              onClick={() => { setExpanded(true); setMode("send"); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold active:scale-95 transition-transform"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Send Money
            </button>
            <button
              onClick={() => { setExpanded(true); setMode("request"); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold active:scale-95 transition-transform"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Request
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && mode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">
                  {mode === "send" ? "💸 Send Money" : "💰 Request Payment"}
                </p>
                <button onClick={() => { setExpanded(false); setMode(null); }} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">AED</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 rounded-lg border border-border bg-background pl-12 pr-3 text-sm font-bold text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />

              <button
                onClick={handleSubmit}
                disabled={loading || !amount}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{
                  background: mode === "send"
                    ? "linear-gradient(135deg, hsl(152 55% 42%), hsl(170 50% 38%))"
                    : "hsl(var(--primary))",
                }}
              >
                {loading ? "Processing…" : mode === "send" ? `Send ${amount || "0"} AED` : `Request ${amount || "0"} AED`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
