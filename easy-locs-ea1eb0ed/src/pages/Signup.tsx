import { useState, useEffect } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { signUpWithEmail } from "@/repositories/auth.repository";
import { Loader2, Mail, Lock, User, Eye, EyeOff, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import PhoneOTPFlow from "@/components/auth/PhoneOTPFlow";
import ContactSyncPrompt from "@/components/auth/ContactSyncPrompt";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import SEOHead from "@/components/SEOHead";
import { runIdentityActivation } from "@/lib/auth/identity-activation-pipeline";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useAuthProviders } from "@/hooks/useAuthProviders";

type SignupMode = "email" | "phone";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<SignupMode>("phone");
  const [phoneActivating, setPhoneActivating] = useState(false);
  const [activatedUserId, setActivatedUserId] = useState<string | null>(null);
  const [showContactSync, setShowContactSync] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();
  const authProviders = useAuthProviders();

  useEffect(() => {
    if (!authProviders.loading && !authProviders.phone && mode === "phone") {
      setMode("email");
    }
  }, [authProviders.loading, authProviders.phone, mode]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      toast({ title: t("auth.signup.weak_password"), description: t("auth.signup.password_hint"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUpWithEmail(email, password, {
      emailRedirectTo: buildAppUrl("/"),
      data: { name },
    });
    setLoading(false);
    if (error) {
      console.error("[Auth] Signup:", error.message);
      toast({ title: t("common.error"), description: error.message || t("common.error_generic") || "Something went wrong. Please try again.", variant: "destructive" });
    } else {
      navigate("/verify-email");
    }
  };

  const handlePhoneVerified = async (phone: string, userId: string, isNewUser: boolean) => {
    setPhoneActivating(true);
    try {
      const activation = await runIdentityActivation({
        userId,
        phone,
        displayName: name || undefined,
        isNewUser,
      });

      if (!activation.success) {
        throw new Error(activation.error || "Activation failed");
      }

      setActivatedUserId(userId);
      setShowContactSync(true);
    } catch (err) {
      console.error("[Auth] Phone signup:", err instanceof Error ? err.message : err);
      toast({
        title: t("common.error") || "Error",
        description: (err instanceof Error ? err.message : null) || t("common.error_generic") || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPhoneActivating(false);
    }
  };

  const handleContactSyncDone = () => {
    setShowContactSync(false);
    navigate("/");
  };

  const inputClass = "w-full bg-background border border-border rounded-xl ps-10 pe-4 h-[var(--input-height)] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all";

  useUiEngine("signup");

  return (
    <SubPageShell noContentPad className="bg-hero flex flex-col items-center justify-center p-4 relative">
      <SEOHead title="Sign Up — Easy-Locs" description="Create your free Easy-Locs account." noindex />
      <AuthBrand />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
        className="bg-card rounded-2xl shadow-card-hover p-6 sm:p-10 max-w-md w-full border border-border/50"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1 text-center">{t("auth.signup.title")}</h1>
        <p className="text-muted-foreground text-sm mb-8 text-center">{t("auth.signup.subtitle")}</p>

        {showContactSync && activatedUserId && (
          <ContactSyncPrompt
            userId={activatedUserId}
            onComplete={handleContactSyncDone}
            onSkip={handleContactSyncDone}
          />
        )}

        {phoneActivating && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(168, 72%, 44%)" }} />
            <p className="text-sm text-muted-foreground">{t("auth.phone.activating") || "Setting up your account…"}</p>
          </div>
        )}

        {!showContactSync && !phoneActivating && (
          <>
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6">
              {(["phone", "email"] as const).map((m) => {
                const isPhoneDisabled = m === "phone" && !authProviders.loading && !authProviders.phone;
                return (
                  <motion.button
                    key={m}
                    type="button"
                    onClick={() => {
                      if (isPhoneDisabled) return;
                      setMode(m);
                    }}
                    title={isPhoneDisabled ? (t("auth.phone.not_available") || "Phone authentication is not available") : undefined}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isPhoneDisabled
                        ? "text-muted-foreground/30 cursor-not-allowed opacity-40"
                        : mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                    whileTap={isPhoneDisabled ? undefined : { scale: 0.97 }}
                  >
                    {m === "phone" ? <Phone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                    {m === "phone" ? (t("auth.signup.phone_tab") || "Phone") : (t("auth.signup.email_tab") || "Email")}
                  </motion.button>
                );
              })}
            </div>

            {mode === "phone" && (
              <PhoneOTPFlow
                onVerified={handlePhoneVerified}
                onCancel={() => setMode("email")}
                title={t("auth.phone.signup_title") || "Sign up with phone"}
                subtitle={t("auth.phone.signup_subtitle") || "Verify your phone number to create your account"}
              />
            )}

            {mode === "email" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.signup.name")}</label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder={t("auth.signup.placeholder_name")} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.signup.email")}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder={t("auth.login.placeholder_email")} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.signup.password")}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pe-10`}
                      placeholder={t("auth.signup.password_hint")} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
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
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signup.submit")}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                </motion.button>
              </form>
            )}

            <SocialLoginButtons />

            <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
              {t("auth.signup.legal_agreement") || "By signing up, you agree to our"}{" "}
              <Link to="/terms" className="underline hover:text-foreground">{t("footer.terms") || "Terms & Conditions"}</Link>{" "}
              {t("common.and") || "and"}{" "}
              <Link to="/privacy" className="underline hover:text-foreground">{t("footer.privacy") || "Privacy Policy"}</Link>.
            </p>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {t("auth.signup.has_account")}{" "}
              <Link to="/login" className="text-foreground font-medium hover:text-accent transition-colors">{t("auth.signup.login")}</Link>
            </p>
          </>
        )}
      </motion.div>
    </SubPageShell>
  );
};

export default Signup;
