import { motion } from "framer-motion";
import { Check, Sparkles, Infinity } from "lucide-react";
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
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("landing.pricing.title")} <span className="text-gradient-gold">{t("landing.pricing.title_highlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto mb-2">
            {t("landing.pricing.subtitle")}
          </p>
          <p className="text-muted-foreground text-sm">{t("landing.pricing.no_commitment")}</p>
        </motion.div>

        {/* Interval toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${interval === "monthly" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {t("landing.pricing.monthly")}
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${interval === "annual" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {t("landing.pricing.annual")}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto"
        >
          <div className="relative bg-card rounded-xl p-8 border border-gold shadow-gold">
            {interval === "annual" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {t("landing.pricing.save_annual")}
              </div>
            )}
            <div className="flex items-center gap-2 mb-1">
              <Infinity className="h-5 w-5 text-gold" />
              <h3 className="text-lg font-bold text-foreground">{t("landing.pricing.plan_name")}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t("landing.pricing.plan_desc")}</p>
            <div className="mb-4">
              <span className="text-5xl font-extrabold text-foreground">{price}€</span>
              <span className="text-muted-foreground text-sm"> / {intLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">{t("landing.pricing.access_desc")}</p>
            <ul className="space-y-2.5 mb-8">
              {featureKeys.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/onboarding"
              className="block w-full text-center py-3 rounded-lg font-semibold bg-gradient-gold text-accent-foreground shadow-gold hover:opacity-90 transition-all"
            >
              {t("landing.pricing.cta")}
            </Link>
          </div>
        </motion.div>

        {/* Payment methods */}
        <div className="flex items-center justify-center gap-4 mt-8 text-xs text-muted-foreground">
          <span>{t("landing.pricing.payment_card")}</span>
          <span>{t("landing.pricing.payment_sepa")}</span>
        </div>

        {/* Legal disclaimer */}
        <div className="max-w-3xl mx-auto mt-8 text-center text-xs text-muted-foreground/70 space-y-2">
          <p>{t("landing.pricing.legal_1")}</p>
          <p>{t("landing.pricing.legal_2")}</p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
