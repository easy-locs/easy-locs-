import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { executeSecureTransfer, createTransactionChallenge, generateIdempotencyKey } from "@/lib/wallet/transactionChallenge";

export default function WalletTransferPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [targetUserId, setTargetUserId] = useState("");
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }
    if (!targetUserId.trim()) {
      toast.error("Enter target user id");
      return;
    }
    const numAmount = Number(amount ?? 0);
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      setSaving(true);

      // Create challenge + idempotency key
      const challenge = createTransactionChallenge({
        amount: numAmount,
        currency: "AED",
        receiverUserId: targetUserId.trim(),
      });

      const idempotencyKey = generateIdempotencyKey({
        senderUserId: user.id,
        receiverUserId: targetUserId.trim(),
        amount: numAmount,
        nonce: challenge.nonce,
      });

      // Execute via backend-authoritative edge function
      const result = await executeSecureTransfer({
        senderUserId: user.id,
        receiverUserId: targetUserId.trim(),
        amount: numAmount,
        currency: "AED",
        idempotencyKey,
        source: "manual_transfer",
        note: note.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Transfer failed");
      }

      if (result.duplicate) {
        toast.info("Transfer already processed");
      } else {
        toast.success("Transfer completed");
      }
      navigate("/wallet/hub");
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet/hub")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Transfer</h1>
          <p className="text-xs text-muted-foreground">Send balance to another user</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <input
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="Target user id"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-3 text-sm"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-3 text-sm"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Note"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-3 text-sm resize-none"
        />
        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {saving ? "Sending..." : "Send Transfer"}
        </button>
      </div>
    </div>
  );
}
