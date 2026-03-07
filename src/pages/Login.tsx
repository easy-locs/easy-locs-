import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import { getPostLoginRoute, waitForAuthenticatedUser } from "@/lib/auth-redirect";

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: t("auth.login.error"), description: error.message, variant: "destructive" });
    } else {
      await redirectAfterLogin();
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await redirectAfterLogin();
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") await redirectAfterLogin();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: t("common.error"), description: t("auth.login.enter_email"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: buildAppUrl("/login?otp=1"),
      },
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
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setLoading(false);
    if (error) {
      toast({ title: t("auth.login.invalid_code"), description: error.message, variant: "destructive" });
    } else {
      await redirectAfterLogin();
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4 pt-20 sm:pt-4">
      <AuthBrand />

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("auth.login.title")}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t("auth.login.subtitle")}</p>

        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-6">
          <button type="button" onClick={() => { setMode("password"); setOtpSent(false); setOtp(""); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === "password" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Lock className="h-3.5 w-3.5" /> {t("auth.login.password_tab")}
          </button>
          <button type="button" onClick={() => { setMode("otp"); setOtpSent(false); setOtp(""); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === "otp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Sparkles className="h-3.5 w-3.5" /> {t("auth.login.otp_tab")}
          </button>
        </div>

        {mode === "password" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.email")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t("auth.login.placeholder_email")} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.password")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.login.submit")}
            </button>
          </form>
        )}

        {mode === "otp" && !otpSent && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.email")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t("auth.login.placeholder_email")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("auth.login.otp_hint")}</p>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.login.send_code")}
            </button>
          </form>
        )}

        {mode === "otp" && otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">{t("auth.login.code_sent_to")} <strong className="text-foreground">{email}</strong></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.otp_label")}</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-ring" placeholder="000000" autoFocus />
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.login.verify")}
            </button>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground">{t("auth.login.change_email")}</button>
          </form>
        )}

        <SocialLoginButtons />

        <div className="flex items-center justify-between mt-6">
          <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">{t("auth.login.forgot")}</Link>
          <p className="text-sm text-muted-foreground">
            <Link to="/signup" className="text-foreground font-medium hover:underline">{t("auth.login.create_account")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;