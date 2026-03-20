import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerOrderGiftsPage() {
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");

  const saveGift = () => {
    if (!recipient.trim()) { toast.error("Enter recipient name"); return; }
    toast.success("Gift order details saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Gift Order</h1>
          <p className="text-xs text-muted-foreground">Send as a gift</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Gift message" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3 resize-none" />
        <button onClick={saveGift} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">Save Gift Details</button>
      </div>
    </div>
  );
}
