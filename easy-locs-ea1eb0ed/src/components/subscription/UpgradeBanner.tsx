import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Sparkles, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface UpgradeBannerProps {
  requiredTier?: string;
  featureLabel?: string;
}

const UpgradeBanner = ({ featureLabel }: UpgradeBannerProps) => {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-14 px-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, hsl(var(--accent) / 0.06) 0%, transparent 70%)" }} />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="relative mb-5"
      >
        <div
          className="w-18 h-18 rounded-2xl flex items-center justify-center relative"
          style={{
            background: "linear-gradient(135deg, hsl(var(--accent) / 0.15) 0%, hsl(var(--accent) / 0.05) 100%)",
            border: "1px solid hsl(var(--accent) / 0.2)",
            width: 72,
            height: 72,
          }}
        >
          <Lock className="h-8 w-8 text-accent" />
          <div
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: "hsl(var(--accent))",
              boxShadow: "0 2px 8px hsl(var(--accent) / 0.4)",
            }}
          >
            <Sparkles className="h-3 w-3 text-white" />
          </div>
        </div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-lg font-bold text-foreground mb-2 text-center"
      >
        {featureLabel || t("gating.feature_locked")}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-sm text-muted-foreground text-center max-w-sm mb-8 leading-relaxed"
      >
        {t("page.upgrade.desc")}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="flex flex-col items-center gap-3"
      >
        <Link
          to="/dashboard/billing"
          className="group inline-flex items-center gap-2.5 font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.85) 100%)",
            color: "white",
            boxShadow: "0 4px 16px hsl(var(--accent) / 0.35), 0 1px 3px hsl(0 0% 0% / 0.1)",
          }}
        >
          {t("page.upgrade.cta")}
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>{(() => { const v = t("gating.secure_upgrade"); return v && v !== "gating.secure_upgrade" ? v : "Secure & instant upgrade"; })()}</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UpgradeBanner;
