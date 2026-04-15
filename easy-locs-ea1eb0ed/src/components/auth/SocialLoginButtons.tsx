/**
 * AUTH DEPENDENCY: SocialLoginButtons.tsx — Google/Apple OAuth buttons.
 * Contact points:
 *   - Login.tsx, Signup.tsx: rendered as child component
 *   - Calls: db.auth.signInWithOAuth (google/apple) — redirects to OAuth provider
 *   - Uses: useAuthProviders (provider-health) to gate button visibility
 *   - Uses: buildAppUrl for OAuth redirect URL construction
 */
import { useState } from "react";
import { db as supabase } from "@/services/db";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Loader2 } from "lucide-react";
import { buildAppUrl } from "@/lib/app-domain";
import { useAuthProviders } from "@/hooks/useAuthProviders";
import {
  authLog, authError as authErrorLog,
} from "@/lib/auth/auth-trace";

const SocialLoginButtons = () => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const providers = useAuthProviders();

  const redirectUrl = buildAppUrl("/auth/callback");

  const handleOAuth = async (provider: "google" | "apple") => {
    const isAvailable = provider === "google" ? providers.google : providers.apple;
    if (!isAvailable && !providers.loading) {
      authLog("SOCIAL_LOGIN_PROVIDER_UNAVAILABLE", { provider });
      toast({
        title: t("auth.social.unavailable_title") || "Non disponible",
        description:
          provider === "google"
            ? t("auth.social.google_not_configured") || "La connexion Google n'est pas encore disponible. Elle sera activée prochainement."
            : t("auth.social.apple_not_configured") || "La connexion Apple n'est pas encore disponible. Elle sera activée prochainement.",
      });
      return;
    }

    const setLoading = provider === "google" ? setLoadingGoogle : setLoadingApple;
    setLoading(true);

    const traceId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    authLog("SOCIAL_LOGIN_STARTED", { traceId, provider, redirectUrl });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: provider === "apple" ? { response_mode: "fragment" } : undefined,
        },
      });

      if (error) {
        authErrorLog("SOCIAL_LOGIN_FAILED", { traceId, provider, error: error.message });

        const msg = error.message.toLowerCase();
        let description: string;
        if (msg.includes("provider is not enabled") || msg.includes("unsupported")) {
          description = t("auth.social.provider_not_enabled") || "Ce mode de connexion n'est pas encore activé. Il sera disponible prochainement.";
        } else if (msg.includes("network") || msg.includes("fetch")) {
          description = t("auth.social.network_error") || "Erreur réseau. Vérifiez votre connexion et réessayez.";
        } else {
          description = provider === "google"
            ? t("auth.social.google_error") || "Erreur lors de la connexion Google."
            : t("auth.social.apple_error") || "Erreur lors de la connexion Apple.";
        }

        toast({ title: t("common.error"), description, variant: "destructive" });
        return;
      }

      if (data?.url) {
        authLog("SOCIAL_LOGIN_REDIRECT", { traceId, provider });
        window.location.href = data.url;
      } else {
        authLog("SOCIAL_LOGIN_NO_URL", { traceId, provider });
        toast({
          title: t("common.error"),
          description: t("auth.social.redirect_failed") || "Impossible de rediriger vers le fournisseur d'authentification.",
          variant: "destructive",
        });
      }
    } catch (err) {
      authErrorLog("SOCIAL_LOGIN_EXCEPTION", {
        traceId,
        provider,
        error: err instanceof Error ? err.message : String(err),
      });

      toast({
        title: t("common.error"),
        description: t("auth.social.generic_error") || "Une erreur inattendue s'est produite. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const googleDisabled = !providers.loading && !providers.google;
  const appleDisabled = !providers.loading && !providers.apple;

  return (
    <div className="space-y-3">
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">{t("auth.social.or")}</span>
        </div>
      </div>

      <div className="relative group">
        <button
          onClick={() => handleOAuth("google")}
          disabled={loadingGoogle || providers.loading || googleDisabled}
          className={`w-full flex items-center justify-center gap-3 bg-background border border-border rounded-xl py-3 min-h-[48px] text-sm font-semibold transition-all ${
            googleDisabled
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : "text-foreground hover:bg-muted/60 hover:border-accent/20 disabled:opacity-50"
          }`}
        >
          {loadingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : providers.loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
            <svg className={`h-5 w-5 ${googleDisabled ? "opacity-50 grayscale" : ""}`} viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span className="truncate">{t("auth.social.google")}</span>
        </button>
        {googleDisabled && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover border border-border rounded text-xs text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm z-10">
            {t("auth.social.google_coming_soon") || "Bientôt disponible"}
          </div>
        )}
      </div>

      <div className="relative group">
        <button
          onClick={() => handleOAuth("apple")}
          disabled={loadingApple || providers.loading || appleDisabled}
          className={`w-full flex items-center justify-center gap-3 border border-transparent rounded-xl py-3 min-h-[48px] text-sm font-semibold transition-all ${
            appleDisabled
              ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
              : "bg-foreground text-background hover:opacity-90 disabled:opacity-50"
          }`}
        >
          {loadingApple ? <Loader2 className="h-4 w-4 animate-spin" /> : providers.loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
            <svg className={`h-5 w-5 ${appleDisabled ? "opacity-50" : ""}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          <span className="truncate">{t("auth.social.apple")}</span>
        </button>
        {appleDisabled && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover border border-border rounded text-xs text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm z-10">
            {t("auth.social.apple_coming_soon") || "Bientôt disponible"}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialLoginButtons;
