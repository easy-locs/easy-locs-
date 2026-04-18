import { useEffect, useState } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getUser, onAuthStateChange, resendEmailVerification } from "@/repositories/auth.repository";
import { Mail, Phone, RefreshCw, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { useUiEngine } from "@/hooks/useUiEngine";

type Channel = "email" | "phone" | "verified" | "loading" | "error";

/**
 * Narrow view of the Supabase user object used by the verification gate.
 * Avoids `any` so callers can't accidentally read unknown metadata.
 */
type AuthUserView = {
  email?: string | null;
  phone?: string | null;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
  user_metadata?: { signup_method?: string | null } | null;
};

const GET_USER_TIMEOUT_MS = 5_000;

function getUserWithTimeout() {
  return Promise.race([
    getUser(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`getUser timed out (${GET_USER_TIMEOUT_MS}ms)`)), GET_USER_TIMEOUT_MS)
    ),
  ]) as ReturnType<typeof getUser>;
}

const VerifyAccount = () => {
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<Channel>("loading");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  useUiEngine("verifyaccount");

  const evaluate = (rawUser: AuthUserView | null) => {
    if (!rawUser) {
      // No session (e.g., visitor opened an old verification email after
      // signing out). Don't trap them on an infinite spinner — bounce to
      // /login so they can sign in again.
      navigate("/login", { replace: true });
      return;
    }
    const user = rawUser;
    const hasEmail = !!user.email;
    const hasPhone = !!user.phone;
    const emailConfirmed = !!user.email_confirmed_at;
    const phoneConfirmed = !!user.phone_confirmed_at;
    const explicitPhoneSignup = user.user_metadata?.signup_method === "phone";

    if (user.email) setEmail(user.email);
    if (user.phone) setPhone(user.phone);

    // Phone-verified → route to dashboard. Tightened to require either an
    // actual `phone_confirmed_at` stamp from Supabase or the explicit
    // `signup_method=phone` metadata tag set by our own signup pipeline.
    // The previous fallback `(hasPhone && !hasEmail)` was overly permissive
    // and could let an unverified phone signup slip past the gate.
    if (phoneConfirmed || explicitPhoneSignup) {
      setChannel("verified");
      navigate("/dashboard", { replace: true });
      return;
    }
    if (emailConfirmed) {
      setChannel("verified");
      navigate("/dashboard", { replace: true });
      return;
    }
    // Has phone identity AND email — let them choose. Default to email screen
    // (the historical UX) but keep a switch to phone confirmation in the UI.
    setChannel(hasEmail ? "email" : (hasPhone ? "phone" : "email"));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await getUserWithTimeout();
        if (!cancelled) evaluate(user as AuthUserView | null);
      } catch (err) {
        console.warn("[VerifyAccount] getUser failed/timed out:", err);
        if (!cancelled) setChannel("error");
      }
    })();
    const { data: { subscription } } = onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        getUserWithTimeout()
          .then(({ data: { user } }) => { if (!cancelled) evaluate(user as AuthUserView | null); })
          .catch((err) => {
            console.warn("[VerifyAccount] getUser refresh failed:", err);
            if (!cancelled) setChannel("error");
          });
      }
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleResendEmail = async () => {
    if (!email) {
      toast({ title: t("common.error"), description: "No email on file.", variant: "destructive" });
      return;
    }
    setResending(true);
    const { error } = await resendEmailVerification(email);
    setResending(false);
    if (error) {
      console.error("[Auth]", error.message);
      toast({ title: t("common.error"), description: t("common.error_generic") || "Something went wrong. Please try again.", variant: "destructive" });
    } else {
      toast({ title: t("auth.verify.resent"), description: t("auth.verify.resent_desc") });
    }
  };

  if (channel === "loading" || channel === "verified") {
    return (
      <SubPageShell noContentPad className="bg-hero flex items-center justify-center p-4">
        <SEOHead title="Verify Account — Easy-Locs" description="Verify your account." noindex />
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </SubPageShell>
    );
  }

  if (channel === "error") {
    // getUser timed out or threw — surface an actionable fallback instead of
    // an indefinite spinner. The user can sign in again or hit dashboard
    // directly (the dashboard's own ProtectedRoute will re-evaluate session
    // state once the call recovers).
    return (
      <SubPageShell noContentPad className="bg-hero flex items-center justify-center p-4">
        <SEOHead title="Verify Account — Easy-Locs" description="Verify your account." noindex />
        <div className="bg-card rounded-2xl shadow-card-hover p-8 max-w-md w-full text-center border border-border/50">
          <h1 className="text-xl font-bold text-foreground mb-2">
            {t("auth.verify.error_title") || "We couldn't reach the server"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {t("auth.verify.error_desc") || "Your verification status could not be loaded. Please sign in again or try once more."}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              {t("common.retry") || "Try again"}
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition-all"
            >
              {t("auth.verify.sign_in_again") || "Sign in again"}
            </Link>
          </div>
        </div>
      </SubPageShell>
    );
  }

  const isPhone = channel === "phone";
  const Icon = isPhone ? Phone : Mail;
  const target = isPhone ? phone : email;
  const fallbackLabel = isPhone ? "your phone number" : (t("auth.verify.your_address") as string);

  return (
    <SubPageShell noContentPad className="bg-hero flex items-center justify-center p-4">
      <SEOHead title="Verify Account — Easy-Locs" description="Verify your account to access Easy-Locs." noindex />
      <AuthBrand />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
        className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full text-center border border-border/50"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6"
        >
          <Icon className="h-8 w-8 text-accent" />
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isPhone ? "Verify your phone" : (t("auth.verify.title") as string)}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {isPhone
            ? <>We sent a verification code to <strong className="text-foreground">{target || fallbackLabel}</strong>. Enter it in the app to continue.</>
            : <>{t("auth.verify.desc")} <strong className="text-foreground">{target || fallbackLabel}</strong>. {t("auth.verify.desc2")}</>}
        </p>

        <motion.div
          className="w-12 h-12 rounded-full border-2 border-accent/20 mx-auto mb-6 flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-3 h-3 rounded-full bg-accent/40" />
        </motion.div>

        <p className="text-xs text-muted-foreground mb-4">Waiting for confirmation...</p>

        {!isPhone && (
          <motion.button
            onClick={handleResendEmail}
            disabled={resending}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-all disabled:opacity-50"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("auth.verify.resend")}
          </motion.button>
        )}

        {/* Channel switch — only when both email and phone are on file */}
        {!!email && !!phone && (
          <button
            onClick={() => setChannel(isPhone ? "email" : "phone")}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isPhone ? "Use email instead" : "Use phone instead"}
          </button>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("auth.verify.back")}
          </Link>
        </div>
      </motion.div>
    </SubPageShell>
  );
};

export default VerifyAccount;
