import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <SubPageShell title="Vérifiez votre email">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Vérifiez votre adresse email</h1>
        <p className="text-muted-foreground mb-2">
          Un lien de confirmation a été envoyé à votre adresse email.
        </p>
        <p className="text-muted-foreground">
          Redirection vers la page de connexion dans {countdown} secondes…
        </p>
      </div>
    </SubPageShell>
  );
}
