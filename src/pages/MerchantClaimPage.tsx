import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getMerchantProfile,
  getMerchantByToken,
  claimRestaurant,
  isAlreadyClaimed,
  sendClaimOtp,
  verifyClaimOtp,
  sendClaimEmailCode,
  verifyClaimEmailCode,
  logClaimAttempt,
  checkClaimRateLimit,
} from "@/lib/merchant/claim-service";
import { trackOutreachEvent } from "@/lib/merchant/outreach-service";
import { checkOtpAbuse } from "@/lib/security/fraud-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Phone, Mail, Shield, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

type Step = "welcome" | "verify" | "otp" | "confirm" | "done";

export default function MerchantClaimPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const profileIdParam = params.get("id");

  const [step, setStep] = useState<Step>("welcome");
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifyMethod, setVerifyMethod] = useState<"phone" | "email">("phone");
  const [verifyValue, setVerifyValue] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setUserId(auth.user?.id ?? null);

      if (token) {
        await trackOutreachEvent(token, "clicked");
        const outreach = await getMerchantByToken(token);
        if (outreach?.merchant_onboarding_profiles) {
          setMerchant(outreach.merchant_onboarding_profiles);
        }
      } else if (profileIdParam) {
        const m = await getMerchantProfile(profileIdParam);
        setMerchant(m);
      }
      setLoading(false);
    })();
  }, [token, profileIdParam]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!verifyValue.trim()) { toast.error("Enter your contact info"); return; }
    if (!userId) { toast.error("Please log in first"); navigate("/login"); return; }

    setSendingOtp(true);
    try {
      // Rate limit check
      await checkClaimRateLimit(userId);
      await checkOtpAbuse(verifyValue);

      if (verifyMethod === "phone") {
        await sendClaimOtp(verifyValue);
      } else {
        await sendClaimEmailCode(verifyValue);
      }

      setOtpSent(true);
      setCountdown(60);
      setStep("otp");
      toast.success(`Verification code sent to ${verifyValue}`);

      // Log attempt
      await logClaimAttempt({
        merchantProfileId: merchant.id,
        userId,
        verificationMethod: verifyMethod,
        verificationValue: verifyValue,
        status: "attempted",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to send code");
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { toast.error("Enter 6-digit code"); return; }
    
    setVerifying(true);
    try {
      let isValid = false;
      if (verifyMethod === "phone") {
        isValid = await verifyClaimOtp(verifyValue, otpCode);
      } else {
        isValid = await verifyClaimEmailCode(verifyValue, otpCode);
      }

      if (!isValid) {
        toast.error("Invalid code. Please try again.");
        setVerifying(false);

        // Log failed attempt
        if (userId) {
          await logClaimAttempt({
            merchantProfileId: merchant.id,
            userId,
            verificationMethod: verifyMethod,
            verificationValue: verifyValue,
            status: "rejected",
            flagged: true,
          });
        }
        return;
      }

      setVerified(true);
      toast.success("Verified! ✅");
      setStep("confirm");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }
    setVerifying(false);
  };

  const handleClaim = async () => {
    if (!merchant || !userId) {
      toast.error("Please log in to claim this restaurant");
      navigate("/login");
      return;
    }

    if (!verified) {
      toast.error("Please verify your identity first");
      return;
    }

    setClaiming(true);
    try {
      await claimRestaurant({
        profileId: merchant.id,
        userId,
        verificationMethod: verifyMethod,
        verificationValue: verifyValue,
      });
      setStep("done");
      toast.success("Restaurant claimed successfully! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Failed to claim");
    }
    setClaiming(false);
  };

  const stepMap: Record<Step, number> = { welcome: 0, verify: 1, otp: 2, confirm: 3, done: 4 };
  const progressPct = ((stepMap[step] + 1) / 5) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Store className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Restaurant not found</h2>
            <p className="text-sm text-muted-foreground">This activation link may have expired or the restaurant has already been claimed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (merchant.onboarding_status !== "imported_not_claimed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
            <h2 className="text-lg font-bold text-foreground">Already Claimed</h2>
            <p className="text-sm text-muted-foreground">{merchant.merchant_name} has already been claimed.</p>
            <Button onClick={() => navigate(`/merchant/dashboard?id=${merchant.id}`)} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-3 pb-2">
        <div className="max-w-lg mx-auto">
          <span className="text-xs font-medium text-muted-foreground">Step {stepMap[step] + 1} / 5</span>
          <Progress value={progressPct} className="h-1.5 mt-1" />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {step === "welcome" && (
                <div className="text-center space-y-6 py-8">
                  <div className="text-5xl">🏪</div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Is this your restaurant?
                  </h1>
                  <Card className="text-left">
                    <CardContent className="pt-4 space-y-2">
                      <h3 className="text-lg font-bold text-foreground">{merchant.merchant_name}</h3>
                      {merchant.name_ar && <p className="text-sm text-muted-foreground font-medium" dir="rtl">{merchant.name_ar}</p>}
                      {merchant.cuisine_type && <Badge variant="secondary">{merchant.cuisine_type}</Badge>}
                      <p className="text-sm text-muted-foreground">
                        {merchant.area}{merchant.city ? `, ${merchant.city}` : ""}
                      </p>
                      {merchant.phone && <p className="text-xs text-muted-foreground">📞 {merchant.phone}</p>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                      <div className="text-xl mb-1">💰</div>
                      <div className="text-sm font-bold text-foreground">0 AED</div>
                      <div className="text-[10px] text-muted-foreground">to join</div>
                    </div>
                    <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                      <div className="text-xl mb-1">📊</div>
                      <div className="text-sm font-bold text-foreground">5%</div>
                      <div className="text-[10px] text-muted-foreground">commission</div>
                    </div>
                    <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                      <div className="text-xl mb-1">⚡</div>
                      <div className="text-sm font-bold text-foreground">2 min</div>
                      <div className="text-[10px] text-muted-foreground">to activate</div>
                    </div>
                  </div>
                </div>
              )}

              {step === "verify" && (
                <div className="space-y-6 py-4">
                  <div className="text-center">
                    <Shield className="h-10 w-10 mx-auto text-primary mb-3" />
                    <h2 className="text-xl font-bold text-foreground">Verify Ownership</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We'll send a 6-digit code to verify your identity
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setVerifyMethod("phone")}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        verifyMethod === "phone" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <Phone className="h-5 w-5 mb-2 text-primary" />
                      <div className="text-sm font-semibold text-foreground">Phone</div>
                      <div className="text-[11px] text-muted-foreground">SMS code</div>
                    </button>
                    <button
                      onClick={() => setVerifyMethod("email")}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        verifyMethod === "email" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <Mail className="h-5 w-5 mb-2 text-primary" />
                      <div className="text-sm font-semibold text-foreground">Email</div>
                      <div className="text-[11px] text-muted-foreground">Email code</div>
                    </button>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      {verifyMethod === "phone" ? "Business phone number" : "Business email"}
                    </label>
                    <Input
                      type={verifyMethod === "phone" ? "tel" : "email"}
                      value={verifyValue}
                      onChange={(e) => setVerifyValue(e.target.value)}
                      placeholder={verifyMethod === "phone" ? "+971 5X XXX XXXX" : "owner@restaurant.com"}
                      className="h-11"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      We'll send a verification code to this {verifyMethod === "phone" ? "number" : "address"}
                    </p>
                  </div>
                </div>
              )}

              {step === "otp" && (
                <div className="space-y-6 py-4 text-center">
                  <Shield className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Enter Verification Code</h2>
                  <p className="text-sm text-muted-foreground">
                    Code sent to <span className="font-semibold text-foreground">{verifyValue}</span>
                  </p>

                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {countdown > 0 ? (
                      <span>Resend in {countdown}s</span>
                    ) : (
                      <button onClick={handleSendOtp} className="text-primary hover:underline">
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === "confirm" && (
                <div className="space-y-6 py-4 text-center">
                  <div className="text-5xl">✅</div>
                  <h2 className="text-xl font-bold text-foreground">Identity Verified</h2>
                  <p className="text-sm text-muted-foreground">
                    By claiming <span className="font-semibold text-foreground">{merchant.merchant_name}</span>,
                    you confirm that you are the authorized owner or manager.
                  </p>
                  <Card>
                    <CardContent className="pt-4 text-left space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Restaurant:</span> <strong>{merchant.merchant_name}</strong></p>
                      <p><span className="text-muted-foreground">Verified via:</span> {verifyMethod} — {verifyValue} <CheckCircle2 className="inline h-3.5 w-3.5 text-emerald-500" /></p>
                      <p><span className="text-muted-foreground">Location:</span> {merchant.area}, {merchant.city || "Dubai"}</p>
                    </CardContent>
                  </Card>
                  <p className="text-[11px] text-muted-foreground">
                    False claims may result in account suspension.
                  </p>
                </div>
              )}

              {step === "done" && (
                <div className="space-y-6 py-8 text-center">
                  <div className="text-5xl">🎉</div>
                  <h2 className="text-2xl font-bold text-foreground">You're In!</h2>
                  <p className="text-muted-foreground">
                    <strong>{merchant.merchant_name}</strong> is now yours. Set up your menu, payment, and go live.
                  </p>
                  <Button
                    onClick={() => navigate(`/merchant/dashboard?id=${merchant.id}`)}
                    className="h-12 text-base w-full"
                  >
                    Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom CTA */}
      {step !== "done" && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
          <div className="max-w-lg mx-auto">
            {step === "welcome" && (
              <Button onClick={() => { if (!userId) { toast.error("Please log in first"); navigate("/login"); return; } setStep("verify"); }} className="w-full h-12 text-base font-semibold">
                Claim this restaurant <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === "verify" && (
              <Button
                onClick={handleSendOtp}
                className="w-full h-12 text-base font-semibold"
                disabled={!verifyValue.trim() || sendingOtp}
              >
                {sendingOtp ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</> : <>Send Verification Code <ArrowRight className="h-4 w-4 ml-2" /></>}
              </Button>
            )}
            {step === "otp" && (
              <Button
                onClick={handleVerifyOtp}
                className="w-full h-12 text-base font-semibold"
                disabled={otpCode.length !== 6 || verifying}
              >
                {verifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…</> : "Verify Code"}
              </Button>
            )}
            {step === "confirm" && (
              <Button
                onClick={handleClaim}
                className="w-full h-12 text-base font-semibold"
                disabled={claiming}
              >
                {claiming ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Claiming…</> : "Confirm & Claim"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
