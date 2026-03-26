/**
 * /pay/guest/success — Post-payment success page for guest (non-app) users.
 * Verifies payment via backend, shows confirmation, suggests app install.
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { CheckCircle2, Download, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GuestPaymentSuccess() {
  const [params] = useSearchParams();
  const requestId = params.get("request_id");
  const sessionId = params.get("session_id");

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requestId || !sessionId) {
      setVerifying(false);
      setError("Missing payment information");
      return;
    }

    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("verify-guest-payment", {
          body: { session_id: sessionId, payment_request_id: requestId },
        });
        if (fnErr) throw fnErr;
        if (data?.verified) {
          setVerified(true);
        } else {
          setError("Payment not yet confirmed. It may take a moment.");
        }
      } catch (e: any) {
        setError(e.message || "Verification failed");
      } finally {
        setVerifying(false);
      }
    })();
  }, [requestId, sessionId]);

  return (
    <>
      <SEOHead title="Payment Confirmed — Easy Locs" description="Your payment was successful" />
      <div className="app-mobile-page bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full space-y-6 text-center">
          {verifying ? (
            <div className="space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Verifying payment…</p>
            </div>
          ) : verified ? (
            <>
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 h-20 w-20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Payment successful!</h1>
              <p className="text-sm text-muted-foreground">
                Your payment has been processed securely. The recipient has been notified.
              </p>

              {/* App install suggestion */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3 mt-6">
                <p className="text-sm font-medium text-foreground">
                  Want faster payments next time?
                </p>
                <p className="text-xs text-muted-foreground">
                  With the Easy Locs app, pay instantly with your wallet — no card needed.
                </p>
                <div className="flex flex-col gap-2">
                  <Link to="/install">
                    <Button className="w-full gap-2" size="sm">
                      <Download className="h-4 w-4" /> Get the App
                    </Button>
                  </Link>
                  <Link to="/discover">
                    <Button variant="ghost" className="w-full gap-2 text-xs" size="sm">
                      <ArrowRight className="h-3 w-3" /> Explore Easy Locs
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 h-20 w-20 flex items-center justify-center mx-auto">
                <Loader2 className="h-10 w-10 text-amber-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Processing…</h1>
              <p className="text-sm text-muted-foreground">{error || "Please wait while we confirm your payment."}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry verification
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
