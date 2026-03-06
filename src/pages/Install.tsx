import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Download, Smartphone, CheckCircle, Share } from "lucide-react";

const Install = () => {
  const { t } = useI18n();
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto">
          <Smartphone className="h-10 w-10 text-accent" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("page.install.title") !== "page.install.title" ? t("page.install.title") : "Installer Easy-Locs"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("page.install.desc") !== "page.install.desc" ? t("page.install.desc") : "Accédez à Easy-Locs directement depuis votre écran d'accueil, comme une application native."}
          </p>
        </div>

        {installed ? (
          <div className="flex items-center justify-center gap-2 text-green-500 font-medium">
            <CheckCircle className="h-5 w-5" />
            {t("page.install.installed") !== "page.install.installed" ? t("page.install.installed") : "Application installée !"}
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Download className="h-5 w-5" />
            {t("page.install.install_btn") !== "page.install.install_btn" ? t("page.install.install_btn") : "Installer l'application"}
          </button>
        ) : isIOS ? (
          <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground space-y-3">
            <p className="font-medium text-foreground">
              {t("page.install.ios_title") !== "page.install.ios_title" ? t("page.install.ios_title") : "Sur iPhone / iPad :"}
            </p>
            <div className="flex items-start gap-3 text-left">
              <Share className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <p>
                {t("page.install.ios_step") !== "page.install.ios_step"
                  ? t("page.install.ios_step")
                  : "Appuyez sur le bouton Partager en bas de Safari, puis sélectionnez « Sur l'écran d'accueil »."}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("page.install.browser_hint") !== "page.install.browser_hint"
              ? t("page.install.browser_hint")
              : "Ouvrez cette page dans Chrome ou Edge pour installer l'application."}
          </p>
        )}

        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground pt-4">
          <div className="space-y-1">
            <div className="text-2xl">📱</div>
            <p>{t("page.install.feature_offline") !== "page.install.feature_offline" ? t("page.install.feature_offline") : "Accès hors-ligne"}</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl">⚡</div>
            <p>{t("page.install.feature_fast") !== "page.install.feature_fast" ? t("page.install.feature_fast") : "Chargement rapide"}</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl">🔔</div>
            <p>{t("page.install.feature_notif") !== "page.install.feature_notif" ? t("page.install.feature_notif") : "Notifications"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Install;
