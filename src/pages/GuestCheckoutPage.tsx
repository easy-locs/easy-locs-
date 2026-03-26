import { useState } from "react";
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { startGuestCheckoutSession, sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth/guest-otp";

export default function GuestCheckoutPage() {
  const { cartId } = useParams();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp" | "done">("phone");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      await startGuestCheckoutSession({ cartId, phone });
      await sendPhoneOtp({ phone });
      setStage("otp");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      await verifyPhoneOtp({ phone, otpCode: otp });
      setStage("done");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background p-4 space-y-6 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Guest Checkout</h1>
        <p className="text-sm text-muted-foreground">Phone OTP verification</p>
      </div>

      {stage === "phone" && (
        <div className="space-y-3">
          <input
            className="w-full border border-border rounded-xl p-3 bg-background text-foreground text-sm"
            placeholder="+971 5X XXX XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            onClick={send}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl p-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </div>
      )}

      {stage === "otp" && (
        <div className="space-y-3">
          <input
            className="w-full border border-border rounded-xl p-3 bg-background text-foreground text-sm text-center tracking-widest"
            placeholder="6-digit code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button
            onClick={verify}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl p-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify OTP"}
          </button>
        </div>
      )}

      {stage === "done" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">✓ OTP verified. Continue to payment.</p>
        </div>
      )}
    </div>
  );
}
