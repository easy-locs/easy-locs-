import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

const featureKeys = [
  "landing.pricing.feat_countries",
  "landing.pricing.feat_properties",
  "landing.pricing.feat_tenants",
  "landing.pricing.feat_rental_modes",
  "landing.pricing.feat_ota_sync",
  "landing.pricing.feat_legal_docs",
  "landing.pricing.feat_leases",
  "landing.pricing.feat_esign",
  "landing.pricing.feat_archive",
  "landing.pricing.feat_pdf",
  "landing.pricing.feat_support",
];

const Pricing = () => {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const { t } = useI18n();
  const price = interval === "monthly" ? 9.99 : 99;
  const intLabel = interval === "monthly" ? t("landing.pricing.per_month") : t("landing.pricing.per_year");

  return (
    <section id="pricing" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div className="container max-w-lg relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-10 space-y-4"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
            {t("landing.pricing.title")} <span className="text-gradient-gold">{t("landing.pricing.title_highlight")}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">{t("landing.pricing.subtitle")}</p>
          <p className="text-muted-foreground text-sm">{t("landing.pricing.no_commitment")}</p>
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["monthly", "annual"] as const).map((v) => (
            <motion.button
              key={v}
              onClick={() => setInterval(v)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                interval === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t(`landing.pricing.${v}`)}
            </motion.button>
          ))}
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="bg-card rounded-2xl p-7 border border-accent/30 relative overflow-hidden"
          style={{ boxShadow: "0 0 40px hsl(var(--accent) / 0.08), 0 0 80px hsl(var(--accent) / 0.03)" }}
        >
          {interval === "annual" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs font-bold px-4 py-1 rounded-b-lg flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              {t("landing.pricing.save_annual")}
            </motion.div>
          )}

          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-gold" />
            <h3 className="text-lg font-bold text-foreground">{t("landing.pricing.plan_name")}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{t("landing.pricing.plan_desc")}</p>

          <motion.div
            className="mb-4"
            key={price}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="text-4xl sm:text-5xl font-extrabold text-foreground">{price}€</span>
            <span className="text-muted-foreground text-sm ml-1">/ {intLabel}</span>
          </motion.div>
          <p className="text-xs text-muted-foreground mb-6">{t("landing.pricing.access_desc")}</p>

          <ul className="space-y-2.5 mb-8">
            {featureKeys.map((key, i) => (
              <motion.li
                key={key}
                className="flex items-start gap-2 text-sm text-foreground"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
              >
                <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <span>{t(key)}</span>
              </motion.li>
            ))}
          </ul>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/onboarding"
              className="block w-full text-center py-3.5 rounded-xl font-bold text-sm transition-all relative overflow-hidden group"
              style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 20px hsl(var(--accent) / 0.25)" }}
            >
              <span className="relative z-10">{t("landing.pricing.cta")}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </motion.div>
        </motion.div>

        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <span>{t("landing.pricing.payment_card")}</span>
          <span>{t("landing.pricing.payment_sepa")}</span>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
