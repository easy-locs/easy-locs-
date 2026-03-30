import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppLogo from "@/components/AppLogo";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import { getPostLoginRoute, waitForAuthenticatedUser } from "@/lib/auth-redirect";
import SEOHead from "@/components/SEOHead";
import {
  authLog, authWarn, authError, authTraceSummary,
  setActiveTrace, clearActiveTrace,
} from "@/lib/auth/auth-trace";

type AuthMode = "password" | "otp";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("password");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();
  const hasRedirected = useRef(false);
  const loginInFlight = useRef(false);

  const redirectAfterLogin = useCallback(async (traceId: string, knownUserId?: string) => {
    if (hasRedirected.current) return;
    const userId = knownUserId ?? (await waitForAuthenticatedUser())?.id;
    if (!userId) return;

    authLog("LOGIN_SESSION_DETECTED", { traceId, userId });

    const destination = await getPostLoginRoute(userId);
    authLog("LOGIN_REDIRECT_STARTED", { traceId, destination });

    hasRedirected.current = true;
    navigate(destination, { replace: true });

    authLog("LOGIN_REDIRECT_COMPLETED", { traceId, destination });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInFlight.current) return;
    loginInFlight.current = true;

    const traceId = crypto.randomUUID();
    const flowStart = Date.now();
    setActiveTrace(traceId, flowStart);

    authLog("LOGIN_SUBMIT_STARTED", { traceId, email, timestamp: flowStart });
    setLoading(true);
    setRetryStatus(null);

    let failedStep: string | null = null;
    const MAX_RETRIES = 2;
    const abortController = new AbortController();

    const attemptLogin = async (attempt: number): Promise<void> => {
      // Exponential backoff: 10s → 12s → 15s (give server more time on retries)
      const LOGIN_TIMEOUT_MS = 10_000 + attempt * 2_000;

      if (attempt > 0) {
        setRetryStatus(`Nouvelle tentative… (${attempt}/${MAX_RETRIES})`);
      }

      authLog("LOGIN_SUPABASE_REQUEST_STARTED", { traceId, attempt, timeoutMs: LOGIN_TIMEOUT_MS });
      const reqStart = Date.now();

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => reject(new Error("__TIMEOUT__")), LOGIN_TIMEOUT_MS);
          abortController.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("__ABORTED__"));
          });
        });
        const { data, error } = await Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          timeoutPromise,
        ]);
        const durationMs = Date.now() - reqStart;

        if (error) {
          authError("LOGIN_SUPABASE_RESPONSE", {
            traceId, success: false, error: error.message, durationMs, attempt,
          });
          const isServerTimeout = error.message?.includes("timeout") || error.message?.includes("deadline") || error.message?.includes("504");
          if (isServerTimeout && attempt < MAX_RETRIES) {
            // Exponential backoff: 1.5s, 3s
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
            return attemptLogin(attempt + 1);
          }
          failedStep = "LOGIN_SUPABASE_RESPONSE";
          setLoading(false);
          setRetryStatus(null);
          loginInFlight.current = false;
          clearActiveTrace();
          const msg = isServerTimeout
            ? "Le serveur ne répond pas après plusieurs tentatives. Réessayez dans quelques instants."
            : error.message;
          toast({ title: t("auth.login.error"), description: msg, variant: "destructive" });
          authTraceSummary({ traceId, totalDurationMs: Date.now() - flowStart, finalStatus: "failed", failedStep });
        } else {
          authLog("LOGIN_SUPABASE_RESPONSE", {
            traceId, success: true, error: null, durationMs, attempt,
          });
          setRetryStatus(null);
          loginInFlight.current = false;
          await redirectAfterLogin(traceId, data.user?.id);
          setLoading(false);
          authTraceSummary({ traceId, totalDurationMs: Date.now() - flowStart, finalStatus: "success", failedStep: null });
          clearActiveTrace();
        }
      } catch (err: any) {
        const durationMs = Date.now() - reqStart;
        const isTimeout = err?.message === "__TIMEOUT__";
        const isAborted = err?.message === "__ABORTED__";

        if (isAborted) return; // User navigated away

        authError("LOGIN_SUPABASE_RESPONSE", {
          traceId, success: false, error: isTimeout ? "CLIENT_TIMEOUT" : (err?.message ?? "UNKNOWN"), durationMs, attempt,
        });

        if (isTimeout && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          return attemptLogin(attempt + 1);
        }

        failedStep = isTimeout ? "LOGIN_TIMEOUT_TRIGGERED" : "LOGIN_SUPABASE_REQUEST_STARTED";
        setLoading(false);
        setRetryStatus(null);
        loginInFlight.current = false;
        clearActiveTrace();
        toast({
          title: t("auth.login.error"),
          description: isTimeout
            ? "Connexion au serveur expirée après plusieurs tentatives."
            : (err?.message || "Erreur inattendue"),
          variant: "destructive",
        });
        authTraceSummary({ traceId, totalDurationMs: Date.now() - flowStart, finalStatus: "failed", failedStep });
      }
    };

    await attemptLogin(0);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const resumeTraceId = crypto.randomUUID();
        authLog("LOGIN_SESSION_DETECTED", { traceId: resumeTraceId, userId: session.user.id, source: "existing_session" });
        await redirectAfterLogin(resumeTraceId, session.user.id);
      }
    };
    void checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === "SIGNED_IN" && nextSession?.user) {
        const eventTraceId = crypto.randomUUID();
        authLog("LOGIN_SESSION_DETECTED", { traceId: eventTraceId, userId: nextSession.user.id, source: "auth_state_change" });
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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: buildAppUrl("/login?otp=1") },
    });
    setLoading(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
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
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setLoading(false);
    if (error) {
      toast({ title: t("auth.login.invalid_code"), description: error.message, variant: "destructive" });
    } else {
      const otpTraceId = crypto.randomUUID();
      authLog("LOGIN_SESSION_DETECTED", { traceId: otpTraceId, userId: data.user?.id, source: "otp_verify" });
      await redirectAfterLogin(otpTraceId, data.user?.id);
    }
  };

  const inputClass = "w-full bg-background border border-border rounded-xl ps-10 pe-4 h-[var(--input-height)] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all";

  return (
    <div className="app-mobile-page bg-hero flex flex-col items-center justify-center p-4 min-h-screen relative">
      <SEOHead title="Login — Easy-Locs" description="Sign in to your Easy-Locs account." noindex />

      {/* Logo — centered above card */}
      <div className="mb-6">
        <AppLogo variant="auth" linkTo="/" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
        className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full border border-border/50"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1 text-center">{t("auth.login.title")}</h1>
        <p className="text-muted-foreground text-sm mb-6 text-center">{t("auth.login.subtitle")}</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6">
          {(["password", "otp"] as const).map((m) => (
            <motion.button
              key={m}
              type="button"
              onClick={() => { setMode(m); setOtpSent(false); setOtp(""); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              whileTap={{ scale: 0.97 }}
            >
              {m === "password" ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {m === "password" ? t("auth.login.password_tab") : t("auth.login.otp_tab")}
            </motion.button>
          ))}
        </div>

        {mode === "password" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.email")}</label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" className={inputClass} placeholder={t("auth.login.placeholder_email")} />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.password")}</label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input id="login-password" type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" className={`${inputClass} pe-10`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
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

        {mode === "otp" && !otpSent && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.email")}</label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass} placeholder={t("auth.login.placeholder_email")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("auth.login.otp_hint")}</p>
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
          </form>
        )}

        {mode === "otp" && otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-2"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="h-7 w-7 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">{t("auth.login.code_sent_to")} <strong className="text-foreground">{email}</strong></p>
            </motion.div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.otp_label")}</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all" placeholder="000000" autoFocus />
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
            <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">{t("auth.login.change_email")}</button>
          </form>
        )}

        <SocialLoginButtons />

        <div className="flex items-center justify-between mt-6">
          <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-accent transition-colors">{t("auth.login.forgot")}</Link>
          <p className="text-sm text-muted-foreground">
            <Link to="/signup" className="text-foreground font-medium hover:text-accent transition-colors">{t("auth.login.create_account")}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
