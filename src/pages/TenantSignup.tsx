import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { validateTenantInvitation, invokeTenantSignup } from "@/repositories/auth-utils.repository";
import { Loader2, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthBrand from "@/components/auth/AuthBrand";
import { useI18n } from "@/lib/i18n";

const TenantSignup = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setError(t("page.tsignup.invalid_link"));
        setValidating(false);
        return;
      }
      try {
        const data = await validateTenantInvitation(token);
        if (!data || !(data as any).valid) {
          setError(t("page.tsignup.expired_link"));
        } else {
          const inv = data as any;
          setInvitation(inv);
          setEmail(inv.email);
          setName(inv.tenant_name || "");
        }
      } catch {
        setError(t("page.tsignup.expired_link"));
      }
      setValidating(false);
    };
    validate();
  }, [token]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      toast({ title: t("page.tsignup.weak_password"), description: t("page.tsignup.weak_password_desc"), variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const data = await invokeTenantSignup({ email, password, name, token });

      if (!data?.success) {
        const msg = data?.error || t("page.tsignup.activation_error");
        toast({ title: t("common.error") || "Error", description: msg, variant: "destructive" });
        return;
      }

      const { signInWithPassword } = await import("@/repositories/auth-utils.repository");
      const { error: signInError } = await signInWithPassword(email, password);

      if (signInError) {
        toast({
          title: t("page.tsignup.account_activated"),
          description: t("page.tsignup.account_activated_desc"),
        });
        navigate("/login");
        return;
      }

      toast({ title: t("page.tsignup.welcome"), description: t("page.tsignup.welcome_desc") });
      navigate("/tenant");
    } catch (err: any) {
      toast({ title: t("common.error") || "Error", description: err.message || t("page.tsignup.unexpected_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="app-mobile-page bg-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-mobile-page bg-hero flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{t("page.tsignup.invalid_invitation")}</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Link to="/login" className="text-primary font-medium hover:underline text-sm">
            {t("page.tsignup.login_existing")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-hero flex items-center justify-center p-4">
      <AuthBrand />

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t("page.tsignup.verified_badge")}</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1 mt-3">{t("page.tsignup.create_space")}</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {t("page.tsignup.invite_desc")}
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.tsignup.full_name")}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Jean Martin"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.tsignup.email")}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email" required value={email} readOnly
                className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("page.tsignup.email_prefilled")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.tsignup.password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("page.tsignup.password_placeholder")}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("page.tsignup.activate_btn")}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          {t("page.tsignup.powered_by")} <strong>EASY-LOCS<sup>®</sup></strong>
        </p>
      </div>
    </div>
  );
};

export default TenantSignup;