/**
 * Install — PWA install page.
 * PASS 171-175: Animated, progressive disclosure, accessibility, design tokens.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAppInstalled } from "@/hooks/useAppInstalled";
import { Download, Smartphone, CheckCircle, Share, ArrowLeft, Globe, Zap, WifiOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const FEATURES = [
  { icon: WifiOff, labelKey: "page.install.feature_offline", fallback: "Offline access" },
  { icon: Zap, labelKey: "page.install.feature_fast", fallback: "Fast launch" },
  { icon: Bell, labelKey: "page.install.feature_notif", fallback: "Notifications" },
] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const Install = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const alreadyInstalled = useAppInstalled();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setJustInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setJustInstalled(true);
    setDeferredPrompt(null);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const installed = alreadyInstalled || justInstalled;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        className="max-w-md w-full text-center space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Icon */}
        <motion.div variants={fadeUp}>
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "hsl(var(--accent) / 0.15)" }}
          >
            <AnimatePresence mode="wait">
              {installed ? (
                <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
                  <CheckCircle className="h-10 w-10 text-accent" />
                </motion.div>
              ) : (
                <motion.div key="phone" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <Smartphone className="h-10 w-10 text-accent" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Title & desc */}
        <motion.div variants={fadeUp}>
          <h1 className="text-2xl font-bold text-foreground">
            {t("page.install.title")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {t("page.install.desc")}
          </p>
        </motion.div>

        {/* Action area */}
        <motion.div variants={fadeUp}>
          <AnimatePresence mode="wait">
            {installed ? (
              <motion.div
                key="installed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 font-medium text-accent"
              >
                <CheckCircle className="h-5 w-5" />
                {t("page.install.installed")}
              </motion.div>
            ) : deferredPrompt ? (
              <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button
                  onClick={handleInstall}
                  className="w-full gap-2 min-h-[48px] text-sm font-semibold"
                  size="lg"
                >
                  <Download className="h-5 w-5" />
                  {t("page.install.install_btn")}
                </Button>
              </motion.div>
            ) : isIOS ? (
              <motion.div
                key="ios"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground space-y-3"
              >
                <p className="font-medium text-foreground">
                  {t("page.install.ios_title")}
                </p>
                <div className="flex items-start gap-3 text-left">
                  <Share className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <p>{t("page.install.ios_step")}</p>
                </div>
              </motion.div>
            ) : (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
                {t("page.install.browser_hint")}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-3 gap-4 text-xs text-muted-foreground pt-4"
          role="list"
        >
          {FEATURES.map(({ icon: Icon, labelKey, fallback }) => (
            <div key={labelKey} className="space-y-2 flex flex-col items-center" role="listitem">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--accent) / 0.1)" }}
              >
                <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
              </div>
              <p className="font-medium">{t(labelKey) !== labelKey ? t(labelKey) : fallback}</p>
            </div>
          ))}
        </motion.div>

        {/* Nav buttons */}
        <motion.div variants={fadeUp} className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={handleGoBack} className="w-full gap-2 min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
            {t("page.install.back")}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")} className="w-full gap-2 text-muted-foreground min-h-[44px]">
            <Globe className="h-4 w-4" />
            {t("page.install.continue_web")}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Install;
