import { useEffect, useState } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { onAuthStateChange, resendEmailVerification } from "@/repositories/auth.repository";

/**
 * VerifyEmail — prompts the user to verify their email address.
 * Redirects to /dashboard once the user's email is confirmed.
 */
export default function VerifyEmail() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
        navigate("/dashboard", { replace: true });
      }
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendEmailVerification();
      setResent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubPageShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          {resent ? (
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          ) : (
            <Mail className="w-8 h-8 text-primary" />
          )}
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t("verify_email.title", "Vérifiez votre email")}</h1>
          {email && (
            <p className="text-muted-foreground">
              {t("verify_email.sent_to", "Un lien de vérification a été envoyé à")} <strong>{email}</strong>
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            {t("verify_email.instructions", "Cliquez sur le lien dans l'email pour activer votre compte.")}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={handleResend} disabled={loading || resent} variant="default">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {resent
              ? t("verify_email.resent", "Email renvoyé !")
              : t("verify_email.resend", "Renvoyer l'email")}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("verify_email.back_to_login", "Retour à la connexion")}
            </Link>
          </Button>
        </div>
      </div>
    </SubPageShell>
  );
}
