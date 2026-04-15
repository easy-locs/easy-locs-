/**
 * AUTH DEPENDENCY: PhoneOTPFlow.tsx — Phone number + OTP verification UI.
 * Contact points:
 *   - Login.tsx, Signup.tsx: rendered as child component
 *   - Calls: phone-identity.ts (sendPhoneVerification, verifyPhoneCode)
 *   - Uses: useAuthProviders to check phone provider availability
 *   - On verification success: calls onVerified callback → Login.tsx runs identity activation
 *   - Auto-resend on expired codes when cooldown allows
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ArrowRight, Loader2, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { sendPhoneVerification, verifyPhoneCode } from "@/lib/auth/phone-identity";
import type { OtpChannel } from "@/lib/auth/phone-identity";
import { useAuthProviders } from "@/hooks/useAuthProviders";

interface PhoneOTPFlowProps {
  onVerified: (phone: string, userId: string, isNewUser: boolean) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

type FlowStep = "phone" | "otp" | "verified";

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

function validatePhoneFormat(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (!cleaned || cleaned.length < 8) {
    return { valid: false, error: "Le numéro doit contenir au moins 8 chiffres." };
  }
  if (!PHONE_REGEX.test(cleaned)) {
    return { valid: false, error: "Format de numéro invalide. Utilisez le format international (+33...)." };
  }
  return { valid: true };
}

export default function PhoneOTPFlow({ onVerified, onCancel, title, subtitle }: PhoneOTPFlowProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const providers = useAuthProviders();
  const [step, setStep] = useState<FlowStep>("phone");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<OtpChannel>("sms");
  const [activeChannel, setActiveChannel] = useState<OtpChannel>("sms");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOTP = async () => {
    setPhoneError(null);
    const validation = validatePhoneFormat(phone);
    if (!validation.valid) {
      setPhoneError(validation.error || null);
      return;
    }
    if (cooldown > 0) {
      toast({
        title: t("auth.phone.cooldown_title") || "Veuillez patienter",
        description: `${t("auth.otp.resend_in") || "Renvoi possible dans"} ${cooldown}s`,
      });
      return;
    }
    setLoading(true);
    try {
      const result = await sendPhoneVerification(phone, channel);
      setActiveChannel(result.fallback ? "sms" : (result.channel || channel));
      if (result.fallback) {
        toast({
          title: "WhatsApp indisponible",
          description: "Le code a été envoyé par SMS.",
        });
      }
      setStep("otp");
      setCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const lower = msg.toLowerCase();

      let description: string;
      if (lower.includes("sms") && (lower.includes("configuration") || lower.includes("configuré"))) {
        description = t("auth.phone.not_configured") || "Le service SMS est en cours de configuration. Veuillez réessayer plus tard.";
      } else if (lower.includes("trop de tentatives") || lower.includes("too many")) {
        description = t("auth.phone.rate_limited") || "Trop de tentatives. Veuillez patienter quelques minutes.";
      } else if (lower.includes("invalid phone") || lower.includes("numéro")) {
        description = t("auth.phone.invalid_format") || "Numéro de téléphone invalide. Vérifiez le format.";
      } else {
        description = msg || t("common.error_generic") || "Une erreur s'est produite. Réessayez.";
      }

      toast({
        title: t("common.error") || "Erreur",
        description,
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
      if (result.valid && result.userId) {
        setStep("verified");
        setTimeout(() => onVerified(phone, result.userId!, result.isNewUser ?? false), 800);
      } else {
        let description = result.reason || t("auth.otp.invalid") || "Code invalide.";
        const lower = (result.reason || "").toLowerCase();
        const isExpired = lower.includes("expired") || lower.includes("expiré");

        if (isExpired) {
          description = t("auth.otp.expired_auto_resend") || "Le code a expiré. Un nouveau code est envoyé automatiquement.";
          toast({
            title: t("auth.otp.expired_title") || "Code expiré",
            description,
          });
          setOtp(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
          if (cooldown <= 0) {
            try {
              await sendPhoneVerification(phone, channel);
              setCooldown(60);
              toast({ title: t("auth.otp.resent") || "Nouveau code envoyé" });
            } catch {
              toast({
                title: t("common.error") || "Erreur",
                description: t("auth.otp.resend_failed") || "Impossible de renvoyer le code. Réessayez manuellement.",
                variant: "destructive",
              });
            }
          }
        } else {
          toast({
            title: t("auth.otp.invalid") || "Code invalide",
            description,
            variant: "destructive",
          });
          setOtp(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
        }
      }
    } catch (err: unknown) {
      toast({
        title: t("common.error") || "Erreur",
        description: t("auth.otp.verify_error") || "Erreur de vérification. Réessayez.",
        variant: "destructive",
      });
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
      const result = await sendPhoneVerification(phone, channel);
      setActiveChannel(result.fallback ? "sms" : (result.channel || channel));
      setCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      toast({ title: t("auth.otp.resent") || "Code renvoyé" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const lower = msg.toLowerCase();
      let description: string;
      if (lower.includes("too many")) {
        description = t("auth.phone.rate_limited") || "Trop de tentatives. Veuillez patienter.";
      } else {
        description = msg || t("common.error_generic") || "Une erreur s'est produite.";
      }
      toast({ title: t("common.error") || "Erreur", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const goldColor = "hsl(168, 72%, 44%)";

  const phoneDisabled = !providers.loading && !providers.phone && !providers.whatsapp;

  if (phoneDisabled) {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-xl bg-muted/40 border border-border">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: `${goldColor}15` }}
          >
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t("auth.phone.not_available") || "La vérification par SMS n'est pas disponible actuellement."}
          </p>
          <p className="text-xs text-muted-foreground/70 text-center">
            {t("auth.phone.configure_hint") || "Le service SMS est en cours de configuration."}
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-2 text-sm font-medium transition-colors hover:text-foreground"
              style={{ color: goldColor }}
            >
              {t("auth.phone.use_other_method") || "Utiliser une autre méthode"}
            </button>
          )}
        </div>
      </div>
    );
  }

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

            <div className="relative mb-1">
              <Phone
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5"
                style={{ color: goldColor }}
              />
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                placeholder={t("auth.phone.placeholder") || "+33 6 12 34 56 78"}
                className={`w-full bg-background border rounded-xl ps-10 pe-4 h-12 text-base focus:outline-none focus:ring-2 transition-all ${
                  phoneError ? "border-destructive focus:ring-destructive/40" : "border-border"
                }`}
                style={{
                  fontSize: "16px",
                  ["--tw-ring-color" as string]: phoneError ? undefined : goldColor,
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
              />
            </div>
            {phoneError && (
              <p className="text-xs text-destructive mb-3 mt-1 px-1">{phoneError}</p>
            )}
            {!phoneError && <div className="mb-3" />}

            {(providers.phone || providers.whatsapp) && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  disabled={!providers.phone}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    channel === "sms"
                      ? "border-current bg-opacity-10"
                      : "border-border text-muted-foreground hover:border-current hover:text-foreground"
                  } ${!providers.phone ? "opacity-40 cursor-not-allowed" : ""}`}
                  style={{
                    color: channel === "sms" ? goldColor : undefined,
                    backgroundColor: channel === "sms" ? `${goldColor}12` : undefined,
                    borderColor: channel === "sms" ? goldColor : undefined,
                  }}
                >
                  <Phone className="h-4 w-4" />
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("whatsapp")}
                  disabled={!providers.whatsapp}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    channel === "whatsapp"
                      ? "border-current bg-opacity-10"
                      : "border-border text-muted-foreground hover:border-current hover:text-foreground"
                  } ${!providers.whatsapp ? "opacity-40 cursor-not-allowed" : ""}`}
                  style={{
                    color: channel === "whatsapp" ? "#25D366" : undefined,
                    backgroundColor: channel === "whatsapp" ? "#25D36612" : undefined,
                    borderColor: channel === "whatsapp" ? "#25D366" : undefined,
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
              </div>
            )}

            <button
              onClick={handleSendOTP}
              disabled={loading || phone.length < 8 || cooldown > 0}
              className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: goldColor }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : cooldown > 0 ? (
                <span>{t("auth.otp.resend_in") || "Renvoi dans"} {cooldown}s</span>
              ) : (
                <>
                  {t("auth.phone.send_code") || "Envoyer le code de vérification"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("common.cancel") || "Annuler"}
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
                {t("auth.otp.title") || "Entrez le code de vérification"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {activeChannel === "whatsapp"
                  ? (t("auth.otp.sent_via_whatsapp") || "Code envoyé via WhatsApp au")
                  : (t("auth.otp.sent_to") || "Code envoyé par SMS au")
                } <strong>{phone}</strong>
              </p>
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
                <span className="text-sm">{t("auth.otp.verifying") || "Vérification…"}</span>
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
                  ? `${t("auth.otp.resend_in") || "Renvoi dans"} ${cooldown}s`
                  : t("auth.otp.resend") || "Renvoyer le code"}
              </button>
            </div>

            <button
              onClick={() => { setStep("phone"); setOtp(["","","","","",""]); }}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("auth.phone.change") || "Changer de numéro"}
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
              {t("auth.otp.verified") || "Téléphone vérifié !"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("auth.otp.activating") || "Activation de votre compte…"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
