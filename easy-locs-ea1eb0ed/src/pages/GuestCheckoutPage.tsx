import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import { startGuestCheckoutSession, sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth/guest-otp";
import { useUiEngine } from "@/hooks/useUiEngine";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GuestCheckoutPage() {
  useUiEngine("guestcheckoutpage");
  const navigate = useNavigate();
  const { cartId } = useParams();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp" | "done">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await startGuestCheckoutSession({ cartId, phone });
      await sendPhoneOtp({ phone });
      setStage("otp");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send OTP";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setError(null);
    try {
      await verifyPhoneOtp({ phone, otpCode: otp });
      setStage("done");
      toast.success("Phone verified! Redirecting to checkout...");
      setTimeout(() => {
        navigate("/checkout", { replace: true });
      }, 1200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubPageShell title="Guest Checkout" subtitle="Phone OTP verification" onBack={() => navigate(-1)}>
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2.5 mb-3">
          <span className="flex-1">{error}</span>
        </div>
      )}

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
            {loading ? "Sending..." : "Send OTP"}
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
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
          <button
            onClick={() => { setStage("phone"); setOtp(""); }}
            className="w-full text-xs text-muted-foreground py-2"
          >
            Change phone number
          </button>
        </div>
      )}

      {stage === "done" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-sm font-medium text-foreground">Phone verified successfully</p>
          </div>
          <p className="text-xs text-muted-foreground">Redirecting to checkout...</p>
          <Button
            variant="default"
            className="w-full"
            onClick={() => navigate("/checkout", { replace: true })}
          >
            Go to Checkout
          </Button>
        </div>
      )}
    </SubPageShell>
  );
}
