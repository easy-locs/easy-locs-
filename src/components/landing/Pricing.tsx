import { motion } from "framer-motion";
import { Check, Sparkles, User, Users, Building2, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

const FREE_FEATURES = [
  "Unlimited listings & services",
  "Photo uploads & sharing",
  "WhatsApp, Telegram, Email",
  "Communication center",
];

const SOLO_FEATURES = [
  "Everything in Free",
  "1 business profile",
  "Unlimited properties",
  "Leases & contracts",
  "Rent receipts & invoices",
  "Calendar & OTA sync",
  "Documents & e-signature",
  "PDF export",
];

const TEAM_FEATURES = [
  "Everything in Solo",
  "Up to 10 employees",
  "Team collaboration",
  "Priority support",
];

const COMPANY_FEATURES = [
  "Everything in Team",
  "Up to 50 employees",
  "Multi-country",
  "API access",
  "Dedicated support",
];

interface TierData {
  name: string;
  icon: React.ReactNode;
  monthly: number;
  annual: number;
  features: string[];
  highlight?: boolean;
  color: string;
  btnClass: string;
}

const TIERS: TierData[] = [
  {
    name: "Free",
    icon: <Zap className="h-5 w-5" />,
    monthly: 0,
    annual: 0,
    features: FREE_FEATURES,
    color: "border-border",
    btnClass: "bg-muted text-muted-foreground",
  },
  {
    name: "Solo",
    icon: <User className="h-5 w-5" />,
    monthly: 9.99,
    annual: 99,
    features: SOLO_FEATURES,
    color: "border-accent/30",
    btnClass: "bg-accent text-accent-foreground",
  },
  {
    name: "Team",
    icon: <Users className="h-5 w-5" />,
    monthly: 29,
    annual: 299,
    features: TEAM_FEATURES,
    highlight: true,
    color: "border-primary/40 ring-2 ring-primary/20",
    btnClass: "bg-primary text-primary-foreground",
  },
  {
    name: "Company",
    icon: <Building2 className="h-5 w-5" />,
    monthly: 99,
    annual: 999,
    features: COMPANY_FEATURES,
    color: "border-gold/40",
    btnClass: "bg-gradient-gold text-accent-foreground",
  },
];

const Pricing = () => {
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const { t } = useI18n();

  return (
    <section id="pricing" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-10 space-y-3"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
            {t("landing.pricing.title") || "Simple Pricing,"} <span className="text-gradient-gold">{t("landing.pricing.title_highlight") || "Powerful Tools"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">{t("landing.pricing.subtitle") || "Start free. Upgrade when your business grows."}</p>
          <p className="text-muted-foreground text-sm">{t("landing.pricing.no_commitment") || "No commitment — Cancel anytime"}</p>
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["monthly", "annual"] as const).map((v) => (
            <motion.button
              key={v}
              onClick={() => setInterval(v)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all relative ${
                interval === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t(`landing.pricing.${v}`) || (v === "monthly" ? "Monthly" : "Annual")}
              {v === "annual" && (
                <span className="absolute -top-2 -right-2 bg-success text-success-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">-17%</span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier, idx) => {
            const price = interval === "monthly" ? tier.monthly : tier.annual;
            const intLabel = interval === "monthly" ? (t("landing.pricing.per_month") || "mo") : (t("landing.pricing.per_year") || "yr");
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className={`relative bg-card rounded-2xl p-5 border ${tier.color} flex flex-col`}
              >
                {tier.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    Most popular
                  </span>
                )}

                <div className="flex items-center gap-2 mb-1">
                  {tier.icon}
                  <h3 className="font-bold text-foreground text-lg">{tier.name}</h3>
                </div>

                <div className="mt-2 mb-4">
                  <motion.span
                    key={`${tier.name}-${price}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-3xl font-extrabold text-foreground"
                  >
                    {price}€
                  </motion.span>
                  <span className="text-muted-foreground text-sm ml-1">/{tier.monthly === 0 ? "∞" : intLabel}</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to={tier.monthly === 0 ? "/signup" : "/signup"}
                    className={`block w-full text-center py-2.5 rounded-xl font-semibold text-xs transition-all ${tier.btnClass}`}
                  >
                    {tier.monthly === 0 ? (t("landing.pricing.cta_free") || "Get started") : (t("landing.pricing.cta") || "Start free trial")}
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <span>💳 {t("landing.pricing.payment_card") || "Credit card"}</span>
          <span>🏦 {t("landing.pricing.payment_sepa") || "SEPA"}</span>
          <span> Apple Pay</span>
          <span>🟢 Google Pay</span>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
