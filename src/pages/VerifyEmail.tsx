import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, RefreshCw, Loader2 } from "lucide-react";
import logoAdminia from "@/assets/logo-adminia.png";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already verified
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        navigate("/onboarding", { replace: true });
      }
      if (user?.email) setEmail(user.email);
    };
    check();

    // Listen for verification event
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email envoyé", description: "Vérifiez votre boîte de réception." });
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAdminia} alt="Adminia" className="h-8 w-8 rounded" />
          <span className="text-xl font-bold text-primary-foreground">Adminia</span>
        </Link>
      </div>

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-accent-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Vérifiez votre email</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Un email de vérification a été envoyé à <strong className="text-foreground">{email || "votre adresse"}</strong>.
          Cliquez sur le lien pour activer votre compte.
        </p>

        <button
          onClick={handleResend}
          disabled={resending}
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline disabled:opacity-50"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Renvoyer l'email
        </button>

        <div className="mt-8 pt-6 border-t border-border">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
