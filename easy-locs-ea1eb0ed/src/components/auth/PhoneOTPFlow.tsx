import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ArrowRight, Loader2, ShieldCheck, RefreshCw, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { sendPhoneVerification, verifyPhoneCode } from "@/lib/auth/phone-identity";

interface PhoneOTPFlowProps {
  onVerified: (phone: string, sessionId: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

type FlowStep = "phone" | "otp" | "verified";

export default function PhoneOTPFlow({ onVerified, onCancel, title, subtitle }: PhoneOTPFlowProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState<FlowStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 8) {
      toast({ title: t("auth.phone.invalid") || "Invalid phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await sendPhoneVerification(phone);
      setSessionId(result.sessionId);
      if (result.devOtp) setDevOtp(result.devOtp);
      setStep("otp");
      setCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      toast({
        title: t("common.error") || "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  }, []);

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const result = await verifyPhoneCode(phone, code);
      if (result.valid) {
        setStep("verified");
        setTimeout(() => onVerified(phone, result.sessionId || sessionId), 800);
      } else {
        toast({
          title: t("auth.otp.invalid") || "Invalid code",
          description: result.reason || "Please try again.",
          variant: "destructive",
        });
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      toast({ title: t("common.error") || "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otp.every((d) => d !== "") && otp.join("").length === 6) {
      handleVerify();
    }
  }, [otp]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const result = await sendPhoneVerification(phone);
      setSessionId(result.sessionId);
      if (result.devOtp) setDevOtp(result.devOtp);
      setCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      toast({ title: t("auth.otp.resent") || "Code resent" });
    } catch (err: any) {
      toast({ title: t("common.error") || "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const goldColor = "hsl(168, 72%, 44%)";
  const navyColor = "hsl(220, 40%, 18%)";

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {step === "phone" && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {title && <h2 className="text-xl font-bold mb-1 text-center">{title}</h2>}
            {subtitle && <p className="text-muted-foreground text-sm mb-6 text-center">{subtitle}</p>}

            <div className="relative mb-4">
              <Phone
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5"
                style={{ color: goldColor }}
              />
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("auth.phone.placeholder") || "+33 6 12 34 56 78"}
                className="w-full bg-background border border-border rounded-xl ps-10 pe-4 h-12 text-base focus:outline-none focus:ring-2 transition-all"
                style={{
                  fontSize: "16px",
                  ["--tw-ring-color" as string]: goldColor,
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
              />
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading || phone.length < 8}
              className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: goldColor }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t("auth.phone.send_code") || "Send verification code"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("common.cancel") || "Cancel"}
              </button>
            )}
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6">
              <div
                className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: `${goldColor}20` }}
              >
                <ShieldCheck className="h-6 w-6" style={{ color: goldColor }} />
              </div>
              <h2 className="text-xl font-bold mb-1">
                {t("auth.otp.title") || "Enter verification code"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("auth.otp.sent_to") || "Code sent to"} <strong>{phone}</strong>
              </p>
              {devOtp && import.meta.env.DEV && (
                <p className="text-xs mt-1 px-3 py-1 rounded-lg inline-block"
                   style={{ background: `${goldColor}20`, color: goldColor }}>
                  DEV: {devOtp}
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-13 text-center text-xl font-bold border border-border rounded-xl bg-background focus:outline-none focus:ring-2 transition-all"
                  style={{
                    fontSize: "20px",
                    ["--tw-ring-color" as string]: goldColor,
                    borderColor: digit ? goldColor : undefined,
                  }}
                />
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t("auth.otp.verifying") || "Verifying…"}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-1 text-sm">
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="flex items-center gap-1 transition-colors disabled:opacity-50"
                style={{ color: cooldown > 0 ? undefined : goldColor }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {cooldown > 0
                  ? `${t("auth.otp.resend_in") || "Resend in"} ${cooldown}s`
                  : t("auth.otp.resend") || "Resend code"}
              </button>
            </div>

            <button
              onClick={() => { setStep("phone"); setOtp(["","","","","",""]); }}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("auth.phone.change") || "Change phone number"}
            </button>
          </motion.div>
        )}

        {step === "verified" && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="text-center py-6"
          >
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: `${goldColor}20` }}
            >
              <CheckCircle2 className="h-8 w-8" style={{ color: goldColor }} />
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: goldColor }}>
              {t("auth.otp.verified") || "Phone verified!"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("auth.otp.activating") || "Activating your account…"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
