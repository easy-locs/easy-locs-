import SubPageShell from "@/components/layout/SubPageShell";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeCodeForSession } from "@/repositories/auth.repository";
import { getPostLoginRoute, waitForAuthenticatedUser } from "@/lib/auth-redirect";
import {
  authLog, authError as authErrorLog, authTraceSummary,
  setActiveTrace, clearActiveTrace,
} from "@/lib/auth/auth-trace";
import { useUiEngine } from "@/hooks/useUiEngine";

function parseOAuthError(errorParam: string, description?: string | null): string {
  const lower = errorParam.toLowerCase();
  if (lower.includes("access_denied") || lower.includes("permission") || lower.includes("user_cancelled")) {
    return description || "Accès refusé. Vous avez peut-être annulé la connexion.";
  }
  if (lower.includes("expired") || lower.includes("invalid_request") || lower.includes("invalid_state")) {
    return "La session d'authentification a expiré. Veuillez réessayer.";
  }
  if (lower.includes("server_error") || lower.includes("temporarily_unavailable")) {
    return description || "Erreur du serveur d'authentification. Réessayez dans quelques instants.";
  }
  if (lower.includes("provider") || lower.includes("not_enabled") || lower.includes("unsupported")) {
    return "Ce mode de connexion n'est pas encore activé. Veuillez utiliser une autre méthode.";
  }
  return description || "L'authentification a échoué. Veuillez réessayer.";
}

function extractParamsFromFragmentAndSearch(): {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
  accessToken: string | null;
  refreshToken: string | null;
} {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  return {
    code: searchParams.get("code"),
    error: searchParams.get("error") || hashParams.get("error"),
    errorDescription: searchParams.get("error_description") || hashParams.get("error_description"),
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
  };
}

export default function AuthCallbackPage() {
  useUiEngine("authcallbackpage");
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connexion en cours…");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const traceId = crypto.randomUUID();
    const flowStart = Date.now();
    setActiveTrace(traceId, flowStart);

    authLog("OAUTH_CALLBACK_STARTED", {
      traceId,
      hasHash: !!window.location.hash,
      hasSearch: !!window.location.search,
      pathname: window.location.pathname,
    });

    const finishAuth = async () => {
      try {
        const {
          code,
          error: errorParam,
          errorDescription,
          accessToken,
          refreshToken,
        } = extractParamsFromFragmentAndSearch();

        if (errorParam) {
          authErrorLog("OAUTH_CALLBACK_ERROR_PARAM", {
            traceId,
            error: errorParam,
            description: errorDescription,
          });
          const friendlyMessage = parseOAuthError(errorParam, errorDescription);
          setMessage(friendlyMessage);
          setStatus("error");
          setTimeout(() => navigate("/login", { replace: true }), 3000);
          return;
        }

        if (accessToken && refreshToken) {
          authLog("OAUTH_CALLBACK_FRAGMENT_TOKEN", { traceId, method: "fragment_tokens" });
          setMessage("Validation de la session…");

          try {
            const { data: sessionData, error: sessionErr } = await import("@/services/db").then(
              (m) => m.db.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            );

            if (sessionErr || !sessionData?.user) {
              authErrorLog("OAUTH_CALLBACK_FRAGMENT_SESSION_FAILED", {
                traceId,
                error: sessionErr?.message || "No user in session",
              });
              setMessage("Échec de la validation de session. Redirection…");
              setStatus("error");
              setTimeout(() => navigate("/login", { replace: true }), 3000);
              return;
            }

            authLog("OAUTH_CALLBACK_FRAGMENT_SESSION_SET", { traceId, userId: sessionData.user.id });
            setMessage("Bienvenue !");
            setStatus("success");
            const destination = await getPostLoginRoute(sessionData.user.id);
            navigate(destination, { replace: true });
            return;
          } catch (fragErr) {
            authErrorLog("OAUTH_CALLBACK_FRAGMENT_EXCEPTION", {
              traceId,
              error: fragErr instanceof Error ? fragErr.message : String(fragErr),
            });
          }
        }

        if (code) {
          authLog("OAUTH_CALLBACK_CODE_EXCHANGE", { traceId, method: "code_in_url" });
          setMessage("Échange du code d'autorisation…");

          const { data, error } = await exchangeCodeForSession(code);

          if (error) {
            authErrorLog("OAUTH_CALLBACK_CODE_EXCHANGE_FAILED", { traceId, error: error.message });
            const msg = error.message.toLowerCase();
            let friendlyMessage: string;
            if (msg.includes("expired") || msg.includes("invalid") || msg.includes("invalid_grant")) {
              friendlyMessage = "Le code d'autorisation a expiré. Veuillez réessayer.";
            } else if (msg.includes("network") || msg.includes("fetch")) {
              friendlyMessage = "Erreur réseau lors de l'échange. Vérifiez votre connexion.";
            } else {
              friendlyMessage = "Échec de l'échange du code. Redirection…";
            }
            setMessage(friendlyMessage);
            setStatus("error");
            setTimeout(() => navigate("/login", { replace: true }), 3000);
            return;
          }

          if (data.session?.user) {
            authLog("OAUTH_CALLBACK_CODE_SESSION_SET", { traceId, userId: data.session.user.id });
            setMessage("Bienvenue !");
            setStatus("success");
            const destination = await getPostLoginRoute(data.session.user.id);
            authLog("OAUTH_CALLBACK_REDIRECT", { traceId, destination });
            navigate(destination, { replace: true });
            return;
          }
        }

        authLog("OAUTH_CALLBACK_FALLBACK_SESSION_CHECK", { traceId });
        setMessage("Vérification de la session…");

        const user = await waitForAuthenticatedUser(8, 300);

        if (user) {
          authLog("OAUTH_CALLBACK_SESSION_FOUND", { traceId, userId: user.id });
          setMessage("Bienvenue !");
          setStatus("success");
          const destination = await getPostLoginRoute(user.id);
          navigate(destination, { replace: true });
        } else {
          authLog("OAUTH_CALLBACK_NO_SESSION", { traceId });
          setMessage("Aucune session trouvée. Redirection…");
          setStatus("error");
          setTimeout(() => navigate("/login", { replace: true }), 2000);
        }

        authTraceSummary({
          traceId,
          totalDurationMs: Date.now() - flowStart,
          finalStatus: user ? "success" : "failed",
          failedStep: user ? null : "OAUTH_CALLBACK_NO_SESSION",
        });
      } catch (err) {
        authErrorLog("OAUTH_CALLBACK_EXCEPTION", {
          traceId,
          error: err instanceof Error ? err.message : String(err),
        });

        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        let friendlyMessage: string;
        if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
          friendlyMessage = "Erreur réseau. Vérifiez votre connexion et réessayez.";
        } else {
          friendlyMessage = "Erreur de connexion. Redirection…";
        }
        setMessage(friendlyMessage);
        setStatus("error");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      } finally {
        clearActiveTrace();
      }
    };

    finishAuth();
  }, [navigate]);

  return (
    <SubPageShell noContentPad className="flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        {status === "loading" && (
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        )}
        {status === "success" && (
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        {status === "error" && (
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
      </div>
    </SubPageShell>
  );
}
