/**
 * Install V2 — Full platform showcase + PWA install.
 * Sections: Hero → Platform pillars → Tech stack → Install CTA.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAppInstalled } from "@/hooks/useAppInstalled";
import {
  Download, Smartphone, CheckCircle, Share, ArrowLeft, Globe,
  Zap, WifiOff, Bell, ShoppingBag, Building2, Wallet, MessageSquare,
  Truck, Shield, BarChart3, CreditCard, MapPin, Star, Lock,
  Users, FileText, CalendarCheck, ChevronDown, Sparkles, Database,
  Layers, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useInView } from "framer-motion";

/* ─── Animation variants ─── */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
};

/* ─── Platform pillars data ─── */
const PILLARS = [
  {
    icon: ShoppingBag,
    titleKey: "install.pillar.marketplace",
    titleFallback: "Marketplace",
    descKey: "install.pillar.marketplace_desc",
    descFallback: "Quality-gated listings, dynamic pricing, booking engine & trust scores",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    features: ["install.feat.quality_gate", "install.feat.dynamic_pricing", "install.feat.booking_engine", "install.feat.trust_score"],
    featureFallbacks: ["Quality gate", "Dynamic pricing", "Booking engine", "Trust scores"],
  },
  {
    icon: Building2,
    titleKey: "install.pillar.property",
    titleFallback: "Property Management",
    descKey: "install.pillar.property_desc",
    descFallback: "Leases, rent tracking, accounting isolation & document generation",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    features: ["install.feat.leases", "install.feat.accounting", "install.feat.documents", "install.feat.interventions"],
    featureFallbacks: ["Leases", "Accounting", "Documents", "Interventions"],
  },
  {
    icon: Wallet,
    titleKey: "install.pillar.wallet",
    titleFallback: "Wallet & Payments",
    descKey: "install.pillar.wallet_desc",
    descFallback: "LOCS credits, multi-currency FX, Stripe Connect & real-time sync",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    features: ["install.feat.locs_credits", "install.feat.multi_currency", "install.feat.stripe_connect", "install.feat.realtime_sync"],
    featureFallbacks: ["LOCS credits", "120+ currencies", "Stripe Connect", "Real-time sync"],
  },
  {
    icon: MessageSquare,
    titleKey: "install.pillar.chat",
    titleFallback: "Orbit Communication",
    descKey: "install.pillar.chat_desc",
    descFallback: "E2E encrypted messaging, in-chat payments, deal rooms & calls",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    features: ["install.feat.e2ee", "install.feat.in_chat_pay", "install.feat.deal_rooms", "install.feat.calls"],
    featureFallbacks: ["E2E encryption", "In-chat payments", "Deal rooms", "Voice calls"],
  },
  {
    icon: Truck,
    titleKey: "install.pillar.delivery",
    titleFallback: "Delivery Orchestration",
    descKey: "install.pillar.delivery_desc",
    descFallback: "AI dispatch, live GPS tracking, escrow & multi-actor dashboards",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    features: ["install.feat.ai_dispatch", "install.feat.gps_tracking", "install.feat.escrow", "install.feat.driver_dash"],
    featureFallbacks: ["AI dispatch", "GPS tracking", "Escrow", "Driver dashboard"],
  },
] as const;

const TECH_BADGES = [
  { icon: Layers, label: "React + Vite" },
  { icon: Database, label: "Supabase" },
  { icon: Shield, label: "RLS + E2EE" },
  { icon: RefreshCw, label: "Realtime" },
  { icon: Sparkles, label: "AI Engines" },
  { icon: Lock, label: "RBAC" },
];

const PWA_FEATURES = [
  { icon: WifiOff, labelKey: "page.install.feature_offline", fallback: "Offline" },
  { icon: Zap, labelKey: "page.install.feature_fast", fallback: "Fast" },
  { icon: Bell, labelKey: "page.install.feature_notif", fallback: "Notifications" },
  { icon: Shield, labelKey: "page.install.feature_native", fallback: "Native" },
];

/* ─── Animated section wrapper ─── */
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Pillar Card ─── */
function PillarCard({ pillar, t }: { pillar: typeof PILLARS[number]; t: (k: string) => string }) {
  const Icon = pillar.icon;
  return (
    <motion.div
      variants={scaleIn}
      className="bg-card border border-border rounded-2xl p-5 space-y-3 hover:shadow-lg hover:border-accent/30 transition-all duration-300"
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${pillar.bg}`}>
          <Icon className={`h-5 w-5 ${pillar.color}`} />
        </div>
        <h3 className="font-bold text-foreground text-sm">
          {t(pillar.titleKey) !== pillar.titleKey ? t(pillar.titleKey) : pillar.titleFallback}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(pillar.descKey) !== pillar.descKey ? t(pillar.descKey) : pillar.descFallback}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {pillar.features.map((fKey, i) => (
          <span
            key={fKey}
            className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
          >
            {t(fKey) !== fKey ? t(fKey) : pillar.featureFallbacks[i]}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Main Install V2 Page ─── */
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

    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => setJustInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setJustInstalled(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  }, [navigate]);

  const installed = alreadyInstalled || justInstalled;

  const scrollToInstall = useCallback(() => {
    document.getElementById("install-cta")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ HERO ═══ */}
      <Section className="relative overflow-hidden px-6 pt-12 pb-8">
        {/* Gradient orb background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        
        <motion.div variants={fadeUp} className="relative z-10 max-w-lg mx-auto text-center space-y-5">
          {/* Logo pill */}
          <motion.div
            variants={scaleIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-accent">Easy-Locs Super App</span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-3xl font-extrabold text-foreground tracking-tight leading-tight">
            {t("install.v2.hero_title") !== "install.v2.hero_title"
              ? t("install.v2.hero_title")
              : "Votre écosystème immobilier & commerce complet"}
          </motion.h1>

          <motion.p variants={fadeUp} className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {t("install.v2.hero_desc") !== "install.v2.hero_desc"
              ? t("install.v2.hero_desc")
              : "Marketplace, gestion locative, wallet, communication chiffrée et livraison — tout dans une seule app."}
          </motion.p>

          <motion.div variants={fadeUp} className="pt-2">
            <Button onClick={scrollToInstall} size="lg" className="gap-2 min-h-[48px] rounded-xl font-semibold">
              <Download className="h-5 w-5" />
              {t("page.install.install_btn")}
            </Button>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            variants={fadeUp}
            className="pt-4"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground/50 mx-auto" />
          </motion.div>
        </motion.div>
      </Section>

      {/* ═══ PLATFORM PILLARS ═══ */}
      <Section className="px-5 pb-10">
        <motion.div variants={fadeUp} className="max-w-lg mx-auto mb-6 text-center">
          <h2 className="text-lg font-bold text-foreground">
            {t("install.v2.pillars_title") !== "install.v2.pillars_title"
              ? t("install.v2.pillars_title")
              : "5 piliers, 1 plateforme"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t("install.v2.pillars_desc") !== "install.v2.pillars_desc"
              ? t("install.v2.pillars_desc")
              : "Chaque module fonctionne en synergie via le bus événementiel ORBIT."}
          </p>
        </motion.div>

        <div className="max-w-lg mx-auto space-y-3">
          {PILLARS.map((p) => (
            <PillarCard key={p.titleKey} pillar={p} t={t} />
          ))}
        </div>
      </Section>

      {/* ═══ TECH STACK ═══ */}
      <Section className="px-5 pb-10">
        <motion.div variants={fadeUp} className="max-w-lg mx-auto">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground text-center">
              {t("install.v2.tech_title") !== "install.v2.tech_title"
                ? t("install.v2.tech_title")
                : "Infrastructure robuste"}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {TECH_BADGES.map(({ icon: Icon, label }) => (
                <motion.div
                  key={label}
                  variants={scaleIn}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted/50"
                >
                  <Icon className="h-4 w-4 text-accent" />
                  <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
                </motion.div>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { value: "60+", label: t("install.v2.stat_tables") !== "install.v2.stat_tables" ? t("install.v2.stat_tables") : "Tables DB" },
                { value: "120+", label: t("install.v2.stat_currencies") !== "install.v2.stat_currencies" ? t("install.v2.stat_currencies") : "Devises" },
                { value: "31", label: t("install.v2.stat_langs") !== "install.v2.stat_langs" ? t("install.v2.stat_langs") : "Langues" },
              ].map((s) => (
                <motion.div key={s.label} variants={fadeUp} className="text-center">
                  <p className="text-lg font-extrabold text-accent">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ═══ PWA FEATURES ═══ */}
      <Section className="px-5 pb-6">
        <motion.div variants={fadeUp} className="max-w-lg mx-auto">
          <div className="grid grid-cols-4 gap-3">
            {PWA_FEATURES.map(({ icon: Icon, labelKey, fallback }) => (
              <motion.div
                key={labelKey}
                variants={scaleIn}
                className="flex flex-col items-center gap-1.5 py-3"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground text-center">
                  {t(labelKey) !== labelKey ? t(labelKey) : fallback}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ═══ INSTALL CTA ═══ */}
      <Section className="px-6 pb-12" >
        <motion.div
          id="install-cta"
          variants={fadeUp}
          className="max-w-md mx-auto text-center space-y-5 scroll-mt-8"
        >
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto bg-accent/15">
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

          <h2 className="text-xl font-bold text-foreground">
            {t("page.install.title")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("page.install.desc")}
          </p>

          {/* Action */}
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
                  className="w-full gap-2 min-h-[48px] text-sm font-semibold rounded-xl"
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

          {/* Nav */}
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={handleGoBack} className="w-full gap-2 min-h-[44px] rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              {t("page.install.back")}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="w-full gap-2 text-muted-foreground min-h-[44px]">
              <Globe className="h-4 w-4" />
              {t("page.install.continue_web")}
            </Button>
          </div>
        </motion.div>
      </Section>
    </div>
  );
};

export default Install;
