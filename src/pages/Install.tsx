/**
 * Install — PWA install page.
 * PASS 169: Design token consistency, accessibility, i18n.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Download, Smartphone, CheckCircle, Share, ArrowLeft, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const Install = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "hsl(var(--accent) / 0.15)" }}
        >
          <Smartphone className="h-10 w-10 text-accent" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("page.install.title") !== "page.install.title" ? t("page.install.title") : "Install Easy-Locs"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("page.install.desc") !== "page.install.desc" ? t("page.install.desc") : "Access Easy-Locs directly from your home screen, like a native app."}
          </p>
        </div>

        {installed ? (
          <div className="flex items-center justify-center gap-2 font-medium" style={{ color: "hsl(var(--hud-success, 142 71% 45%))" }}>
            <CheckCircle className="h-5 w-5" />
            {t("page.install.installed") !== "page.install.installed" ? t("page.install.installed") : "App installed!"}
          </div>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstall}
            className="w-full gap-2 min-h-[48px] text-sm font-semibold"
            size="lg"
          >
            <Download className="h-5 w-5" />
            {t("page.install.install_btn") !== "page.install.install_btn" ? t("page.install.install_btn") : "Install the app"}
          </Button>
        ) : isIOS ? (
          <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground space-y-3">
            <p className="font-medium text-foreground">
              {t("page.install.ios_title") !== "page.install.ios_title" ? t("page.install.ios_title") : "On iPhone / iPad:"}
            </p>
            <div className="flex items-start gap-3 text-left">
              <Share className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <p>
                {t("page.install.ios_step") !== "page.install.ios_step"
                  ? t("page.install.ios_step")
                  : "Tap the Share button at the bottom of Safari, then select 'Add to Home Screen'."}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("page.install.browser_hint") !== "page.install.browser_hint"
              ? t("page.install.browser_hint")
              : "Open this page in Chrome or Edge to install the app."}
          </p>
        )}

        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground pt-4" role="list">
          <div className="space-y-1" role="listitem">
            <div className="text-2xl" aria-hidden="true">📱</div>
            <p>{t("page.install.feature_offline") !== "page.install.feature_offline" ? t("page.install.feature_offline") : "Offline access"}</p>
          </div>
          <div className="space-y-1" role="listitem">
            <div className="text-2xl" aria-hidden="true">⚡</div>
            <p>{t("page.install.feature_fast") !== "page.install.feature_fast" ? t("page.install.feature_fast") : "Fast loading"}</p>
          </div>
          <div className="space-y-1" role="listitem">
            <div className="text-2xl" aria-hidden="true">🔔</div>
            <p>{t("page.install.feature_notif") !== "page.install.feature_notif" ? t("page.install.feature_notif") : "Notifications"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={handleGoBack} className="w-full gap-2 min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
            {t("page.install.back") || "Back to listing"}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")} className="w-full gap-2 text-muted-foreground min-h-[44px]">
            <Globe className="h-4 w-4" />
            {t("page.install.continue_web") || "Continue on web"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
