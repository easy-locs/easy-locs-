import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAppUrl("/reset-password"),
    });
    setLoading(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <AuthBrand />

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{t("auth.forgot.sent_title")}</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {t("auth.forgot.sent_desc")} <strong className="text-foreground">{email}</strong>{t("auth.forgot.sent_desc2")}
            </p>
            <Link to="/login" className="text-sm text-foreground font-medium hover:underline">
              {t("auth.forgot.back")}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-1">{t("auth.forgot.title")}</h1>
            <p className="text-muted-foreground text-sm mb-8">{t("auth.forgot.subtitle")}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.login.email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t("auth.login.placeholder_email")} />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.forgot.submit")}
              </button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link to="/login" className="text-foreground font-medium hover:underline">{t("auth.forgot.back")}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;