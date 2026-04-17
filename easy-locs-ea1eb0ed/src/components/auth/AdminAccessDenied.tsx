/**
 * AdminAccessDenied — Shared access-denied panel used by both the
 * `ProtectedRoute` admin gate and `AdminRoute`. Keeps the message
 * (and any future copy/design changes) in a single place.
 */
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AdminAccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-lg font-semibold text-foreground mb-2">
          Accès admin requis
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          Cette page est réservée aux comptes possédant le rôle administrateur.
          Si vous pensez qu’il s’agit d’une erreur, contactez le propriétaire de
          votre espace ou le support.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Aller au dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
