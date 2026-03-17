/**
 * SmartInstallBanner — Non-intrusive bottom banner prompting PWA install.
 * v1: Clean implementation with proper i18n, accessibility, iOS coaching.
 */
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAppInstalled } from "@/hooks/useAppInstalled";
import { Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "pwa-banner-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 20_000;

export default function SmartInstallBanner() {
  const { t } = useI18n();
  const isInstalled = useAppInstalled();
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (isInstalled) return;

    // Mobile only
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

    // Recently dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DURATION_MS) return;

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [isInstalled]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  }, []);

  const shouldShow = visible && !isInstalled && (deferredPrompt || isIOS);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 inset-x-0 z-[9999]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
          role="alert"
          aria-live="polite"
        >
          <div className="mx-3 mb-3 bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent/15">
              <Download className="h-5 w-5 text-accent" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {t("pwa.banner.title")}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {isIOS ? t("pwa.banner.ios_hint") : t("pwa.banner.hint")}
              </p>
            </div>

            {!isIOS && deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="bg-accent text-accent-foreground px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[44px] hover:opacity-90 transition-opacity"
              >
                {t("pwa.banner.install")}
              </button>
            ) : isIOS ? (
              <div className="flex items-center gap-1 text-accent" aria-label="Share">
                <Share className="h-4 w-4" />
              </div>
            ) : null}

            <button
              onClick={handleDismiss}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
              aria-label={t("pwa.banner.dismiss") || "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
