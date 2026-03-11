import { motion } from "framer-motion";
import { Check, Sparkles, User, Users, Building2, Zap, BadgePercent, Globe, ShieldCheck, ArrowRight, Star, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

/* ── Feature lists ── */
const FREE_FEATURES = [
  "Unlimited listings & services",
  "Photo uploads & gallery",
  "Share via WhatsApp, Telegram, Email",
  "Copy link & phone contact",
  "Communication center",
  "Public visibility worldwide",
  "0% commission on your revenue",
];

const SOLO_FEATURES = [
  "Everything in Free",
  "Unlimited properties & services",
  "1 business profile / digital storefront",
  "0% commission — keep 100% of earnings",
  "Long-term, seasonal & sales listings",
  "Legal documents & lease contracts",
  "Inventories & rent receipts",
  "Electronic signature",
  "PDF export & invoicing tools",
  "Payment links & online payments",
  "Client & booking management",
  "Airbnb / Booking / OTA sync",
  "Worldwide service visibility",
  "Secure document archive",
];

const TEAM_FEATURES = [
  "Everything in Solo",
  "Up to 10 employees",
  "Team access & collaboration",
  "Shared business management",
  "Shared calendar & bookings",
  "Multi-service & multi-property",
  "Shared communication center",
  "Priority support",
  "Cross-city & cross-country organization",
];

const COMPANY_FEATURES = [
  "Everything in Team",
  "Up to 50 employees",
  "Multi-country business management",
  "Advanced team structure",
  "Multi-location operations",
  "High-volume listings & services",
  "Scalable business workflows",
  "Stronger company management tools",
  "Dedicated priority support",
];

interface TierData {
  name: string;
  subtitle: string;
  audience: string;
  icon: React.ReactNode;
  monthly: number;
  annual: number;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

const TIERS: TierData[] = [
  {
    name: "Free",
    subtitle: "Publish & share for free",
    audience: "For anyone getting started",
    icon: <Zap className="h-5 w-5" />,
    monthly: 0, annual: 0,
    features: FREE_FEATURES,
  },
  {
    name: "Solo",
    subtitle: "All-in-one business starter",
    audience: "Entrepreneurs & freelancers",
    icon: <User className="h-5 w-5" />,
    monthly: 9.99, annual: 99,
    features: SOLO_FEATURES,
    badge: "Best value",
  },
  {
    name: "Team",
    subtitle: "Grow your business together",
    audience: "Small companies & agencies",
    icon: <Users className="h-5 w-5" />,
    monthly: 29, annual: 299,
    features: TEAM_FEATURES,
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Company",
    subtitle: "Scale without limits",
    audience: "Agencies & larger businesses",
    icon: <Building2 className="h-5 w-5" />,
    monthly: 99, annual: 999,
    features: COMPANY_FEATURES,
    badge: "Enterprise",
  },
];

const TRUST_SIGNALS = [
  { icon: <BadgePercent className="h-5 w-5" />, label: "0% commission", sub: "Keep 100% of your revenue" },
  { icon: <Globe className="h-5 w-5" />, label: "190+ countries", sub: "Worldwide coverage" },
  { icon: <ShieldCheck className="h-5 w-5" />, label: "Secure payments", sub: "Stripe-powered billing" },
  { icon: <Star className="h-5 w-5" />, label: "Cancel anytime", sub: "No lock-in contract" },
];

const Pricing = () => {
  const { t } = useI18n();
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");

  return (
    <section id="pricing" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--accent)) 1px, transparent 0)`,
        backgroundSize: "40px 40px",
      }} />

      <div className="container max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-10 space-y-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-semibold mb-2"
          >
            <Crown className="h-4 w-4" />
            {t("pricing.badge") || "Zero Commission Platform"}
          </motion.div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("pricing.title") || "Simple Pricing,"}{" "}
            <span className="text-gradient-gold">{t("pricing.title_hl") || "Unlimited Potential"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t("pricing.subtitle") || "Manage properties, services, bookings, documents and payments worldwide."}
            <br className="hidden sm:block" />
            <span className="font-semibold text-foreground">{t("pricing.no_cut") || "You earn — we never take a cut."}</span>
          </p>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 max-w-3xl mx-auto"
        >
          {TRUST_SIGNALS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/50 text-center"
            >
              <div className="text-accent">{s.icon}</div>
              <span className="text-xs font-bold text-foreground">{s.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{s.sub}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center bg-muted/50 rounded-full p-1 border border-border/50">
            {(["monthly", "annual"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setInterval(v)}
                className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  interval === v
                    ? "bg-foreground text-background shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "monthly" ? (t("pricing.monthly") || "Monthly") : (t("pricing.annual") || "Annual")}
                {v === "annual" && interval === "annual" && (
                  <span className="absolute -top-2 -right-1 bg-success text-success-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                    -17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {TIERS.map((tier, idx) => {
            const price = interval === "monthly" ? tier.monthly : tier.annual;
            const intLabel = interval === "monthly" ? (t("pricing.per_mo") || "mo") : (t("pricing.per_yr") || "yr");
            const isHighlight = tier.highlight;
            const isFree = tier.monthly === 0;

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, type: "spring", stiffness: 200 }}
                className={`relative bg-card rounded-2xl flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  isHighlight
                    ? "border-2 border-primary shadow-lg shadow-primary/10 lg:-mt-2 lg:mb-2"
                    : "border border-border hover:border-accent/30"
                }`}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className={`text-center py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    isHighlight
                      ? "bg-primary text-primary-foreground"
                      : tier.name === "Company"
                      ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-700 dark:text-amber-400"
                      : "bg-accent/10 text-accent"
                  }`}>
                    {tier.badge}
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  {/* Tier header */}
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className={`p-2 rounded-xl ${
                      isHighlight ? "bg-primary/10 text-primary" :
                      tier.name === "Company" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                      isFree ? "bg-muted text-muted-foreground" :
                      "bg-accent/10 text-accent"
                    }`}>
                      {tier.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg leading-none">{tier.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{tier.audience}</p>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/70 font-medium mb-4">{tier.subtitle}</p>

                  {/* Price */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <motion.span
                        key={`${tier.name}-${price}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black text-foreground tracking-tight"
                      >
                        {price === 0 ? "0" : price}€
                      </motion.span>
                      <span className="text-muted-foreground text-sm">/{isFree ? (t("pricing.forever") || "forever") : intLabel}</span>
                    </div>
                    {interval === "annual" && tier.monthly > 0 && (
                      <p className="text-[11px] text-success font-semibold mt-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> {t("pricing.save") || "Save"} {Math.round((1 - tier.annual / (tier.monthly * 12)) * 100)}% {t("pricing.vs_monthly") || "vs monthly"}
                      </p>
                    )}
                    {isFree && (
                      <p className="text-[11px] text-muted-foreground mt-1">{t("pricing.no_card") || "No credit card required"}</p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-snug">
                        <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                          isHighlight ? "text-primary" : "text-success"
                        }`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    to="/signup"
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      isHighlight
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20"
                        : tier.name === "Company"
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-md"
                        : isFree
                        ? "bg-muted text-foreground hover:bg-muted/80 border border-border"
                        : "bg-accent text-accent-foreground hover:opacity-90"
                    }`}
                  >
                    {isFree ? (t("pricing.cta_free") || "Get started free") : (t("pricing.cta_trial") || "Start free trial")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="mt-12 space-y-6">
          {/* 0% commission banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-5 px-6 rounded-2xl bg-success/5 border border-success/15 max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <BadgePercent className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{t("pricing.zero_commission") || "0% commission — always"}</p>
                <p className="text-xs text-muted-foreground">{t("pricing.zero_commission_desc") || "Your bookings, your payments, your revenue. We never take a cut."}</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-success/20" />
            <div className="text-center sm:text-left">
              <p className="text-xs text-success font-semibold">{t("pricing.vs_airbnb") || "Unlike Airbnb (15-20%)"}</p>
              <p className="text-xs text-success font-semibold">{t("pricing.vs_booking") || "Unlike Booking (15-25%)"}</p>
            </div>
          </motion.div>

          {/* Audience + payment methods */}
          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground max-w-xl mx-auto">
              {t("pricing.audience") || "Built for property owners, entrepreneurs, freelancers, service providers, agencies & companies in 190+ countries."}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">💳 Credit card</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">🏦 SEPA</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1"> Apple Pay</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">🟢 Google Pay</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
