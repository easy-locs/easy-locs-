import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import SubPageShell from "@/components/layout/SubPageShell";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getUser, onAuthStateChange, resendEmailVerification } from "@/repositories/auth.repository";
import { Mail, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { useUiEngine } from "@/hooks/useUiEngine";

const VerifyEmail = () => {
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
<<<<<<< HEAD
    // A user is considered verified for the purpose of leaving this screen if
    // Supabase has stamped either of its native confirmation timestamps. We
    // intentionally do NOT consider a phone-only account verified by absence
    // of an email alone — phone OTP verification must have actually happened.
    // However, if it's a phone-only account with no email attached, there is
    // nothing to verify on this screen.
=======
>>>>>>> 3a6e2ecb33 (Task #1002 — Audit dashboard access and unblock phone-OTP users)
    const isVerified = (u: User | null | undefined): boolean => {
      if (!u) return false;
      if (u.email_confirmed_at) return true;
      if (u.phone_confirmed_at) return true;
      // Phone-only account with no email — nothing to verify here.
      if (u.phone && !u.email) return true;
      return false;
    };

    const check = async () => {
      const { data: { user } } = await getUser();
      if (isVerified(user)) {
        navigate("/dashboard", { replace: true });
      }
      if (user?.email) setEmail(user.email);
    };
    check();

    const { data: { subscription } } = onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        getUser().then(({ data: { user } }) => {
          if (isVerified(user)) {
            navigate("/dashboard", { replace: true });
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResend = async () => {
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

  useUiEngine("verifyemail");

  return (
    <SubPageShell noContentPad className="bg-hero flex items-center justify-center p-4">
      <SEOHead title="Verify Email — Easy-Locs" description="Please verify your email address." noindex />
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
          <Mail className="h-8 w-8 text-accent" />
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground mb-2">{t("auth.verify.title")}</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {t("auth.verify.desc")} <strong className="text-foreground">{email || t("auth.verify.your_address")}</strong>.
          {" "}{t("auth.verify.desc2")}
        </p>

        {/* Animated pulse ring */}
        <motion.div
          className="w-12 h-12 rounded-full border-2 border-accent/20 mx-auto mb-6 flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-3 h-3 rounded-full bg-accent/40" />
        </motion.div>

        <p className="text-xs text-muted-foreground mb-4">Waiting for confirmation...</p>

        <motion.button
          onClick={handleResend}
          disabled={resending}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-all disabled:opacity-50"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("auth.verify.resend")}
        </motion.button>

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

export default VerifyEmail;
