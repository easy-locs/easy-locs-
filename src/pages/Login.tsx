import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import { getPostLoginRoute, waitForAuthenticatedUser } from "@/lib/auth-redirect";
import SEOHead from "@/components/SEOHead";

type AuthMode = "password" | "otp";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>("password");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();
  const hasRedirected = useRef(false);

  const redirectAfterLogin = useCallback(async (knownUserId?: string) => {
    if (hasRedirected.current) return;
    const userId = knownUserId ?? (await waitForAuthenticatedUser())?.id;
    if (!userId) return;
    const route = await getPostLoginRoute(userId);
    hasRedirected.current = true;
    navigate(route, { replace: true });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: t("auth.login.error"), description: error.message, variant: "destructive" });
    } else {
      await redirectAfterLogin(data.user?.id);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await redirectAfterLogin(session.user.id);
    };
    void checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === "SIGNED_IN" && nextSession?.user) {
        await redirectAfterLogin(nextSession.user.id);
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
      await redirectAfterLogin(data.user?.id);
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
