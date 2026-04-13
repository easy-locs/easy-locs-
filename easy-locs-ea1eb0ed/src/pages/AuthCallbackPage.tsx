import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeCodeForSession } from "@/repositories/auth.repository";
import { getPostLoginRoute, waitForAuthenticatedUser } from "@/lib/auth-redirect";
import {
  authLog, authError as authErrorLog, authTraceSummary,
  setActiveTrace, clearActiveTrace,
} from "@/lib/auth/auth-trace";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connecting…");
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
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const code = searchParams.get("code");
        const errorParam = searchParams.get("error") || hashParams.get("error");
        const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

        if (errorParam) {
          authErrorLog("OAUTH_CALLBACK_ERROR_PARAM", {
            traceId,
            error: errorParam,
            description: errorDescription,
          });
          setMessage(errorDescription || "Authentication failed");
          setStatus("error");
          setTimeout(() => navigate("/login", { replace: true }), 2000);
          return;
        }

        if (code) {
          authLog("OAUTH_CALLBACK_CODE_EXCHANGE", { traceId, method: "code_in_url" });
          setMessage("Exchanging code…");

          const { data, error } = await exchangeCodeForSession(code);

          if (error) {
            authErrorLog("OAUTH_CALLBACK_CODE_EXCHANGE_FAILED", { traceId, error: error.message });
            setMessage("Code exchange failed. Redirecting…");
            setStatus("error");
            setTimeout(() => navigate("/login", { replace: true }), 2000);
            return;
          }

          if (data.session?.user) {
            authLog("OAUTH_CALLBACK_CODE_SESSION_SET", { traceId, userId: data.session.user.id });
            setMessage("Welcome!");
            setStatus("success");
            const destination = await getPostLoginRoute(data.session.user.id);
            authLog("OAUTH_CALLBACK_REDIRECT", { traceId, destination });
            navigate(destination, { replace: true });
            return;
          }
        }

        authLog("OAUTH_CALLBACK_FALLBACK_SESSION_CHECK", { traceId });
        setMessage("Verifying session…");

        const user = await waitForAuthenticatedUser(8, 300);

        if (user) {
          authLog("OAUTH_CALLBACK_SESSION_FOUND", { traceId, userId: user.id });
          setMessage("Welcome!");
          setStatus("success");
          const destination = await getPostLoginRoute(user.id);
          navigate(destination, { replace: true });
        } else {
          authLog("OAUTH_CALLBACK_NO_SESSION", { traceId });
          setMessage("No session found. Redirecting…");
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
        setMessage("Connection error. Redirecting…");
        setStatus("error");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      } finally {
        clearActiveTrace();
      }
    };

    finishAuth();
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
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
    </div>
  );
}
