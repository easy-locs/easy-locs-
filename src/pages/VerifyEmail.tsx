import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import { useI18n } from "@/lib/i18n";

const VerifyEmail = () => {
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        navigate("/onboarding", { replace: true });
      }
      if (user?.email) setEmail(user.email);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user?.email_confirmed_at) {
            navigate("/onboarding", { replace: true });
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.verify.resent"), description: t("auth.verify.resent_desc") });
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <AuthBrand />

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-accent-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("auth.verify.title")}</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {t("auth.verify.desc")} <strong className="text-foreground">{email || t("auth.verify.your_address")}</strong>.
          {" "}{t("auth.verify.desc2")}
        </p>

        <button onClick={handleResend} disabled={resending}
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline disabled:opacity-50">
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("auth.verify.resend")}
        </button>

        <div className="mt-8 pt-6 border-t border-border">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            {t("auth.verify.back")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;