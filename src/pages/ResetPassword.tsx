import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import { useI18n } from "@/lib/i18n";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const passwordStrong = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStrong) {
      toast({ title: t("auth.signup.weak_password"), description: t("auth.signup.password_hint"), variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: t("common.error"), description: t("auth.reset.mismatch"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  return (
    <div className="app-mobile-page bg-hero flex items-center justify-center p-4">
      <AuthBrand />

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        {success ? (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">{t("auth.reset.success")}</h1>
            <p className="text-muted-foreground text-sm">{t("auth.reset.redirect")}</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-1">{t("auth.reset.title")}</h1>
            <p className="text-muted-foreground text-sm mb-8">{t("auth.reset.subtitle")}</p>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.reset.new_password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t("auth.reset.min_chars")} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <p className={`text-xs ${password.length >= 8 ? "text-success" : "text-muted-foreground"}`}>✓ {t("auth.reset.min_chars")}</p>
                  <p className={`text-xs ${/[A-Z]/.test(password) ? "text-success" : "text-muted-foreground"}`}>✓ {t("auth.reset.uppercase")}</p>
                  <p className={`text-xs ${/\d/.test(password) ? "text-success" : "text-muted-foreground"}`}>✓ {t("auth.reset.digit")}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.reset.confirm")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type={showPw ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t("auth.reset.placeholder_confirm")} />
                </div>
              </div>
              <button type="submit" disabled={loading || !passwordStrong}
                className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.reset.submit")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;