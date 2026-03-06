import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { useI18n } from "@/lib/i18n";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      toast({ title: t("auth.signup.weak_password"), description: t("auth.signup.password_hint"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      navigate("/verify-email");
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <AuthBrand />

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("auth.signup.title")}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t("auth.signup.subtitle")}</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.signup.name")}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("auth.signup.placeholder_name")} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.signup.email")}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("auth.login.placeholder_email")} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t("auth.signup.password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("auth.signup.password_hint")} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signup.submit")}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.signup.has_account")}{" "}
          <Link to="/login" className="text-foreground font-medium hover:underline">{t("auth.signup.login")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;