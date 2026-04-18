import { useState, useEffect, useRef, useCallback } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  signInWithPassword, signInWithOtp, verifyEmailOtp,
  getSession, onAuthStateChange, getUser,
} from "@/repositories/auth.repository";
import { Loader2, Mail, Lock, Eye, EyeOff, Sparkles, Phone, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import PhoneOTPFlow from "@/components/auth/PhoneOTPFlow";
import ContactSyncPrompt from "@/components/auth/ContactSyncPrompt";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import { getPostLoginRoute, waitForAuthenticatedUser } from "@/lib/auth-redirect";
import SEOHead from "@/components/SEOHead";
import {
  authLog, authWarn, authError, authTraceSummary,
  setActiveTrace, clearActiveTrace,
} from "@/lib/auth/auth-trace";
import { runIdentityActivation } from "@/lib/auth/identity-activation-pipeline";
import { useUiEngine } from "@/hooks/useUiEngine";
import { isPlatformAuthenticatorAvailable, loginWithWebAuthn } from "@/lib/auth/webauthn";
import { useAuthProviders } from "@/hooks/useAuthProviders";

type AuthMode = "password" | "otp" | "phone";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function AuroraBackground({ reduced }: { reduced: boolean }) {
  if (reduced) {
    return <div className="fixed inset-0 bg-[hsl(225_28%_6%)]" aria-hidden="true" />;
  }
  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true" style={{ background: "hsl(225 28% 6%)" }}>
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          left: "10%",
          top: "20%",
          background: "radial-gradient(circle, hsl(168 72% 44% / 0.08) 0%, transparent 60%)",
          willChange: "transform",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          right: "5%",
          bottom: "10%",
          background: "radial-gradient(circle, hsl(260 50% 50% / 0.06) 0%, transparent 60%)",
          willChange: "transform",
        }}
        animate={{ x: [0, -30, 15, 0], y: [0, 25, -15, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, hsl(200 60% 50% / 0.04) 0%, transparent 60%)",
          willChange: "transform",
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("phone");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneActivating, setPhoneActivating] = useState(false);
  const [phoneActivatedUserId, setPhoneActivatedUserId] = useState<string | null>(null);
  const [showContactSync, setShowContactSync] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const [biometricLoginAvailable, setBiometricLoginAvailable] = useState(false);
  const [biometricLoginLoading, setBiometricLoginLoading] = useState(false);
  const authProviders = useAuthProviders();
  const hasRedirected = useRef(false);
  const loginInFlight = useRef(false);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setBiometricLoginAvailable);
  }, []);

  useEffect(() => {
    if (!authProviders.loading && !authProviders.phone && mode === "phone") {
      setMode("password");
    }
  }, [authProviders.loading, authProviders.phone, mode]);

  const redirectAfterLogin = useCallback(async (traceId: string, knownUserId?: string) => {
    if (hasRedirected.current) return;
    const userId = knownUserId ?? (await waitForAuthenticatedUser())?.id;
    if (!userId) return;

    authLog("LOGIN_SESSION_DETECTED", { traceId, userId });

    const fromState = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
    const fromPath = fromState?.pathname
      ? `${fromState.pathname}${fromState.search ?? ""}${fromState.hash ?? ""}`
      : null;
    const isSafeFrom = !!fromPath
      && fromPath.startsWith("/")
      && !fromPath.startsWith("//")
      && fromPath !== "/login";

    const roleHome = await getPostLoginRoute(userId);
    const destination = isSafeFrom ? fromPath! : roleHome;
    authLog("LOGIN_REDIRECT_STARTED", { traceId, destination, fromState: !!isSafeFrom });

    hasRedirected.current = true;
    navigate(destination, { replace: true });

    authLog("LOGIN_REDIRECT_COMPLETED", { traceId, destination });
  }, [navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInFlight.current) return;
    loginInFlight.current = true;

    const traceId = crypto.randomUUID();
    const flowStart = Date.now();
    setActiveTrace(traceId, flowStart);

    authLog("LOGIN_SUBMIT_STARTED", { traceId, email, timestamp: flowStart });
    setLoading(true);
    setRetryStatus("Connexion…");

    let failedStep: string | null = null;

    try {
      authLog("LOGIN_SUPABASE_REQUEST_STARTED", { traceId, attempt: 0 });
      const reqStart = Date.now();
      // Hard cap so a hung request can never leave the user staring at a
      // spinner forever — the user sees a clear error within 12s.
      const SIGN_IN_TIMEOUT_MS = 12_000;
      const { data, error } = await Promise.race([
        signInWithPassword(email, password),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`signInWithPassword timed out (${SIGN_IN_TIMEOUT_MS}ms)`)), SIGN_IN_TIMEOUT_MS)
        ),
      ]) as Awaited<ReturnType<typeof signInWithPassword>>;
      const durationMs = Date.now() - reqStart;

      if (error) {
        authError("LOGIN_SUPABASE_RESPONSE", {
          traceId,
          success: false,
          error: error.message,
          durationMs,
          attempt: 0,
        });

        failedStep = "LOGIN_SUPABASE_RESPONSE";
        const normalizedMessage = error.message.toLowerCase();
        const isInfraError =
          normalizedMessage.includes("timeout") ||
          normalizedMessage.includes("deadline") ||
          normalizedMessage.includes("504") ||
          normalizedMessage.includes("500") ||
          normalizedMessage.includes("database error querying schema") ||
          normalizedMessage.includes("failed to fetch");

        toast({
          title: t("auth.login.error"),
          description: isInfraError
            ? "Le service de connexion est temporairement indisponible. Réessayez dans quelques instants."
            : error.message || t("common.error_generic") || "Something went wrong. Please try again.",
          variant: "destructive",
        });

        authTraceSummary({
          traceId,
          totalDurationMs: Date.now() - flowStart,
          finalStatus: "failed",
          failedStep,
        });
        return;
      }

      authLog("LOGIN_SUPABASE_RESPONSE", {
        traceId,
        success: true,
        error: null,
        durationMs,
        attempt: 0,
      });

      await redirectAfterLogin(traceId, data.user?.id);
      authTraceSummary({
        traceId,
        totalDurationMs: Date.now() - flowStart,
        finalStatus: "success",
        failedStep: null,
      });
    } catch (err) {
      failedStep = "LOGIN_SUPABASE_REQUEST_STARTED";
      authError("LOGIN_SUPABASE_RESPONSE", {
        traceId,
        success: false,
        error: err instanceof Error ? err.message : "UNKNOWN",
        attempt: 0,
      });

      toast({
        title: t("auth.login.error"),
        description: "Le service de connexion est temporairement indisponible. Réessayez dans quelques instants.",
        variant: "destructive",
      });

      authTraceSummary({
        traceId,
        totalDurationMs: Date.now() - flowStart,
        finalStatus: "failed",
        failedStep,
      });
    } finally {
      loginInFlight.current = false;
      setLoading(false);
      setRetryStatus(null);
      clearActiveTrace();
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      // Bound this probe so a slow Supabase response can't silently delay the
      // auto-redirect of an already-logged-in user landing on /login.
      const SESSION_PROBE_TIMEOUT_MS = 4_000;
      let result: Awaited<ReturnType<typeof getSession>> | null = null;
      try {
        result = await Promise.race([
          getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getSession timed out")), SESSION_PROBE_TIMEOUT_MS)
          ),
        ]) as Awaited<ReturnType<typeof getSession>>;
      } catch (err) {
        console.warn("[Login] initial session probe failed:", err);
        return;
      }
      const session = result?.data?.session;
      if (session?.user) {
        const resumeTraceId = crypto.randomUUID();
        authLog("LOGIN_SESSION_DETECTED", { traceId: resumeTraceId, userId: session.user.id, source: "existing_session" });
        await redirectAfterLogin(resumeTraceId, session.user.id);
      }
    };
    void checkSession();

    const { data: { subscription } } = onAuthStateChange(async (event, nextSession) => {
      // Honor BOTH SIGNED_IN (fresh login) and INITIAL_SESSION (restore on
      // page load) so an already-authenticated user landing on /login is
      // never stranded — even if the explicit getSession() probe above
      // timed out under degraded network conditions.
      const isResumeEvent = event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED";
      if (isResumeEvent && nextSession?.user) {
        const eventTraceId = crypto.randomUUID();
        authLog("LOGIN_SESSION_DETECTED", { traceId: eventTraceId, userId: nextSession.user.id, source: `auth_state_change:${event}` });
        await redirectAfterLogin(eventTraceId, nextSession.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [redirectAfterLogin]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: t("common.error"), description: t("auth.login.enter_email"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signInWithOtp(email, { shouldCreateUser: false, emailRedirectTo: buildAppUrl("/login?otp=1") });
    setLoading(false);
    if (error) {
      console.error("[Auth] OTP send:", error.message);
      toast({ title: t("common.error"), description: error.message || t("common.error_generic") || "Something went wrong. Please try again.", variant: "destructive" });
    } else {
      setOtpSent(true);
      toast({ title: t("auth.login.code_sent"), description: t("auth.login.code_sent_desc") });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast({ title: t("common.error"), description: t("auth.login.enter_code"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await verifyEmailOtp(email, otp);
    setLoading(false);
    if (error) {
      console.error("[Auth] OTP verify:", error.message);
      toast({ title: t("auth.login.invalid_code"), description: error.message || t("common.error_generic") || "Something went wrong. Please try again.", variant: "destructive" });
    } else {
      const otpTraceId = crypto.randomUUID();
      authLog("LOGIN_SESSION_DETECTED", { traceId: otpTraceId, userId: data.user?.id, source: "otp_verify" });
      await redirectAfterLogin(otpTraceId, data.user?.id);
    }
  };

  const handlePhoneVerified = async (phone: string, userId: string, isNewUser: boolean) => {
    setPhoneActivating(true);
    const traceId = crypto.randomUUID();
    setActiveTrace(traceId, Date.now());
    authLog("PHONE_LOGIN_STARTED", { traceId, phone, userId, isNewUser });

    try {
      const activation = await runIdentityActivation({
        userId,
        phone,
        isNewUser,
      });
      authLog("IDENTITY_ACTIVATION_COMPLETE", { traceId, ...activation });

      if (!activation.success) {
        throw new Error(activation.error || "Identity activation failed");
      }

      const { data: { user: confirmedUser } } = await getUser();
      if (!confirmedUser) {
        authWarn("PHONE_LOGIN_NO_SESSION", { traceId, userId });
      }

      setPhoneActivatedUserId(userId);

      if (isNewUser) {
        setShowContactSync(true);
      } else {
        await redirectAfterLogin(traceId, userId);
      }
    } catch (err) {
      authError("PHONE_LOGIN_FAILED", { traceId, error: err instanceof Error ? err.message : "UNKNOWN" });
      console.error("[Auth] Phone login:", err instanceof Error ? err.message : err);
      toast({
        title: t("common.error") || "Error",
        description: (err instanceof Error ? err.message : null) || t("common.error_generic") || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPhoneActivating(false);
      clearActiveTrace();
    }
  };

  const handleContactSyncDone = async () => {
    setShowContactSync(false);
    if (phoneActivatedUserId) {
      const traceId = crypto.randomUUID();
      await redirectAfterLogin(traceId, phoneActivatedUserId);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl ps-10 pe-4 h-[var(--input-height)] text-base sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all backdrop-blur-sm";

  useUiEngine("login");

  return (
    <SubPageShell noContentPad className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={{ background: "transparent" }}>
      <SEOHead
        title="Login — Easy-Locs"
        description="Sign in to your Easy-Locs account. Access food delivery, taxi, hotel booking, local services across 190+ countries."
        noindex
      />

      <AuroraBackground reduced={reduced} />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <motion.div
          initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Link to="/" className="inline-block">
            <EasyLocsLogo variant="full" size="lg" animate />
          </Link>
        </motion.div>

        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 180, delay: 0.1 }}
          className="w-full rounded-2xl p-8 sm:p-10 border"
          style={{
            background: "hsl(225 28% 12% / 0.6)",
            backdropFilter: "blur(24px) saturate(140%)",
            WebkitBackdropFilter: "blur(24px) saturate(140%)",
            borderColor: "hsl(210 18% 90% / 0.08)",
            boxShadow: "0 0 0 1px hsl(168 72% 44% / 0.04), 0 8px 40px hsl(225 28% 4% / 0.5), inset 0 1px 0 hsl(210 18% 90% / 0.04)",
          }}
        >
          <motion.div
            variants={reduced ? undefined : containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              variants={reduced ? undefined : itemVariants}
              className="text-2xl font-bold text-white mb-1 text-center"
            >
              {t("auth.login.title")}
            </motion.h1>
            <motion.p
              variants={reduced ? undefined : itemVariants}
              className="text-white/50 text-sm mb-6 text-center"
            >
              {t("auth.login.subtitle")}
            </motion.p>

            {!showContactSync && !phoneActivating && (() => {
              const phoneUnavailable = !authProviders.loading && !authProviders.phone;
              return (
                <motion.div variants={reduced ? undefined : itemVariants} className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 border border-white/5">
                  {(["phone", "password", "otp"] as const).map((m) => {
                    const isPhoneDisabled = m === "phone" && phoneUnavailable;
                    return (
                      <motion.button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (isPhoneDisabled) return;
                          setMode(m); setOtpSent(false); setOtp("");
                        }}
                        title={isPhoneDisabled ? (t("auth.phone.not_available") || "Authentification téléphone non disponible — Twilio non configuré") : undefined}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                          isPhoneDisabled
                            ? "text-white/20 cursor-not-allowed opacity-40"
                            : mode === m
                              ? "bg-white/10 text-white shadow-sm border border-white/10"
                              : "text-white/40 hover:text-white/70"
                        }`}
                        whileTap={isPhoneDisabled ? undefined : { scale: 0.97 }}
                      >
                        {m === "phone" && <Phone className="h-3.5 w-3.5" />}
                        {m === "password" && <Lock className="h-3.5 w-3.5" />}
                        {m === "otp" && <Sparkles className="h-3.5 w-3.5" />}
                        {m === "phone" ? (t("auth.login.phone_tab") || "Phone") : m === "password" ? t("auth.login.password_tab") : t("auth.login.otp_tab")}
                      </motion.button>
                    );
                  })}
                </motion.div>
              );
            })()}

            {showContactSync && phoneActivatedUserId && (
              <ContactSyncPrompt
                userId={phoneActivatedUserId}
                onComplete={handleContactSyncDone}
                onSkip={handleContactSyncDone}
              />
            )}

            {phoneActivating && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(168, 72%, 44%)" }} />
                <p className="text-sm text-white/50">{t("auth.phone.activating") || "Activating your account…"}</p>
              </div>
            )}

            {mode === "phone" && !showContactSync && !phoneActivating && (
              <motion.div variants={reduced ? undefined : itemVariants}>
                <PhoneOTPFlow
                  onVerified={handlePhoneVerified}
                  onCancel={() => setMode("password")}
                  title={t("auth.phone.title") || "Sign in with phone"}
                  subtitle={t("auth.phone.subtitle") || "Enter your phone number to receive a verification code"}
                />
              </motion.div>
            )}

            {mode === "password" && !showContactSync && !phoneActivating && (
              <form onSubmit={handleLogin} className="space-y-4">
                <motion.div variants={reduced ? undefined : itemVariants}>
                  <label htmlFor="login-email" className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.login.email")}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" aria-hidden="true" />
                    <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email" className={inputClass} placeholder={t("auth.login.placeholder_email")} />
                  </div>
                </motion.div>
                <motion.div variants={reduced ? undefined : itemVariants}>
                  <label htmlFor="login-password" className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.login.password")}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" aria-hidden="true" />
                    <input id="login-password" type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password" className={`${inputClass} pe-10`} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute end-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors p-1">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={reduced ? undefined : itemVariants}>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 font-bold py-2.5 sm:py-3 rounded-xl transition-all disabled:opacity-50 text-sm relative overflow-hidden"
                    style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "var(--shadow-gold)" }}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.login.submit")}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  </motion.button>
                </motion.div>
                {retryStatus && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-center text-amber-500 font-medium flex items-center justify-center gap-1.5"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {retryStatus}
                  </motion.p>
                )}
              </form>
            )}

            {mode === "otp" && !otpSent && !showContactSync && !phoneActivating && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <motion.div variants={reduced ? undefined : itemVariants}>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.login.email")}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputClass} placeholder={t("auth.login.placeholder_email")} />
                  </div>
                </motion.div>
                <motion.div variants={reduced ? undefined : itemVariants}>
                  <p className="text-xs text-white/40">{t("auth.login.otp_hint")}</p>
                </motion.div>
                <motion.div variants={reduced ? undefined : itemVariants}>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 font-bold py-2.5 sm:py-3 rounded-xl transition-all disabled:opacity-50 text-sm"
                    style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "var(--shadow-gold)" }}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.login.send_code")}
                  </motion.button>
                </motion.div>
              </form>
            )}

            {mode === "otp" && otpSent && !showContactSync && !phoneActivating && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center mb-2"
                >
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-7 w-7 text-accent" />
                  </div>
                  <p className="text-sm text-white/50">{t("auth.login.code_sent_to")} <strong className="text-white">{email}</strong></p>
                </motion.div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.login.otp_label")}</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all backdrop-blur-sm" placeholder="000000" autoFocus />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2 font-bold py-2.5 sm:py-3 rounded-xl transition-all disabled:opacity-50 text-sm"
                  style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "var(--shadow-gold)" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.login.verify")}
                </motion.button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-sm text-white/40 hover:text-white/70 transition-colors">{t("auth.login.change_email")}</button>
              </form>
            )}

            {!showContactSync && !phoneActivating && biometricLoginAvailable && email.trim() && (
              <motion.button
                type="button"
                disabled={biometricLoginLoading}
                onClick={async () => {
                  setBiometricLoginLoading(true);
                  try {
                    const result = await loginWithWebAuthn({ email: email.trim() });
                    if (result.success && result.actionLink) {
                      window.location.href = result.actionLink;
                    } else if (result.success) {
                      toast({ title: t("auth.biometric.success") || "Biometric verified", description: t("auth.biometric.complete_login") || "Complete login with your credentials" });
                    } else {
                      toast({ title: t("auth.biometric.failed") || "Biometric login failed", description: result.error || "Please use another method", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: t("auth.biometric.failed") || "Biometric login failed", variant: "destructive" });
                  } finally {
                    setBiometricLoginLoading(false);
                  }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border text-white/80 text-sm font-medium transition-all hover:bg-white/5 disabled:opacity-50 mt-3"
                style={{ borderColor: "hsl(210 18% 90% / 0.1)", background: "hsl(225 28% 12% / 0.4)" }}
              >
                {biometricLoginLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                {t("auth.login.biometric") || "Sign in with Biometric"}
              </motion.button>
            )}

            {!showContactSync && !phoneActivating && <SocialLoginButtons />}

            {!showContactSync && !phoneActivating && (
              <motion.div variants={reduced ? undefined : itemVariants} className="flex items-center justify-between mt-6">
                <Link to="/forgot-password" className="text-sm text-white/40 hover:text-accent transition-colors">{t("auth.login.forgot")}</Link>
                <p className="text-sm text-white/40">
                  <Link to="/signup" className="text-white font-medium hover:text-accent transition-colors">{t("auth.login.create_account")}</Link>
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </SubPageShell>
  );
};

export default Login;
