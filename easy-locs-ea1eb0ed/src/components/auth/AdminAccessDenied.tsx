/**
 * AdminAccessDenied — Shared access-denied panel used by both the
 * `ProtectedRoute` admin gate and `AdminRoute`. Keeps the message
 * (and any future copy/design changes) in a single place.
 *
 * Accepts an optional `reason` prop so guards can surface the *exact*
 * cause (email not allowlisted, role missing, RPC failure, chunk failed
 * to load, …) instead of a generic "Access Denied" wall.
 */
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";

export type AdminAccessDeniedReason =
  | "not-authenticated"
  | "email-not-allowlisted"
  | "role-missing"
  | "rpc-error"
  | "super-admin-required"
  | "super-admin-rpc-error"
  | "chunk-load-failed"
  | "unknown";

interface AdminAccessDeniedProps {
  reason?: AdminAccessDeniedReason;
  email?: string | null;
  /** Optional override for retry behaviour (default: window.location.reload). */
  onRetry?: () => void;
}

const REASON_COPY: Record<
  AdminAccessDeniedReason,
  { title: string; body: string; action: string }
> = {
  "not-authenticated": {
    title: "Connexion requise",
    body: "Vous devez être connecté pour accéder à l'espace admin.",
    action: "Se connecter",
  },
  "email-not-allowlisted": {
    title: "Email non autorisé",
    body:
      "Votre email ne figure pas sur la liste blanche des comptes admin. " +
      "Demandez au propriétaire de la plateforme de l'ajouter à VITE_ADMIN_ALLOWLIST.",
    action: "Aller au dashboard",
  },
  "role-missing": {
    title: "Rôle admin manquant",
    body:
      "Votre compte est sur la liste blanche mais ne possède pas encore le rôle " +
      "admin / owner / super_admin en base. Contactez le propriétaire pour " +
      "l'attribuer dans public.user_roles.",
    action: "Aller au dashboard",
  },
  "rpc-error": {
    title: "Vérification des permissions impossible",
    body:
      "L'appel à has_role a échoué. Cela peut être un problème réseau, RLS, " +
      "ou un type app_role incomplet côté base. Réessayez ; si le problème " +
      "persiste, vérifiez la console.",
    action: "Réessayer",
  },
  "super-admin-required": {
    title: "Accès super-admin requis",
    body:
      "Cette section est réservée aux comptes super-admin. Votre rôle actuel " +
      "ne permet pas l'accès.",
    action: "Aller au dashboard",
  },
  "super-admin-rpc-error": {
    title: "Vérification super-admin impossible",
    body:
      "L'appel has_role(super_admin) a échoué. Vérifiez que la valeur " +
      "'super_admin' existe bien dans l'enum public.app_role et que le RPC " +
      "has_role est déployé.",
    action: "Réessayer",
  },
  "chunk-load-failed": {
    title: "Impossible de charger le module admin",
    body:
      "Le bundle JavaScript n'a pas pu être téléchargé (timeout réseau ou " +
      "build périmé). Réessayer rechargera la page.",
    action: "Réessayer",
  },
  unknown: {
    title: "Accès admin requis",
    body:
      "Cette page est réservée aux comptes possédant le rôle administrateur. " +
      "Si vous pensez qu'il s'agit d'une erreur, contactez le propriétaire.",
    action: "Aller au dashboard",
  },
};

export default function AdminAccessDenied({
  reason = "unknown",
  email,
  onRetry,
}: AdminAccessDeniedProps = {}) {
  const navigate = useNavigate();
  const copy = REASON_COPY[reason] ?? REASON_COPY.unknown;
  const isRetry = reason === "rpc-error" ||
    reason === "super-admin-rpc-error" ||
    reason === "chunk-load-failed";

  const handleAction = () => {
    if (isRetry) {
      if (onRetry) onRetry();
      else window.location.reload();
      return;
    }
    if (reason === "not-authenticated") {
      navigate("/login");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div
      className="min-h-[100dvh] bg-background flex items-center justify-center px-4"
      data-testid="admin-access-denied"
      data-reason={reason}
    >
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-lg font-semibold text-foreground mb-2">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">
          {copy.body}
        </p>
        {email ? (
          <p className="text-[11px] text-muted-foreground/80 mb-4">
            Compte connecté : <code className="font-mono">{email}</code>
          </p>
        ) : null}
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
            onClick={handleAction}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {isRetry ? <RefreshCw className="h-4 w-4" /> : null}
            {copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}
