import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, User, Users, Building2, Zap, BadgePercent, Globe, ShieldCheck, ArrowRight, Star, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

const usePricingFeatures = (t: (key: string) => string) => {
  const FREE_FEATURES = [
    t("pricing.f.free.1") || "Unlimited listings & services",
    t("pricing.f.free.2") || "Photo uploads & gallery",
    t("pricing.f.free.3") || "Share via WhatsApp, Telegram, Email",
    t("pricing.f.free.4") || "Copy link & phone contact",
    t("pricing.f.free.5") || "Communication center",
    t("pricing.f.free.6") || "Public visibility worldwide",
    t("pricing.f.free.7") || "0% commission on your revenue",
  ];
  const SOLO_FEATURES = [
    t("pricing.f.solo.0") || "Everything in Free",
    t("pricing.f.solo.1") || "Unlimited properties & services",
    t("pricing.f.solo.2") || "1 business profile / digital storefront",
    t("pricing.f.solo.3") || "0% commission — keep 100% of earnings",
    t("pricing.f.solo.4") || "Long-term, seasonal & sales listings",
    t("pricing.f.solo.5") || "Legal documents & lease contracts",
    t("pricing.f.solo.6") || "Inventories & rent receipts",
    t("pricing.f.solo.7") || "Electronic signature",
    t("pricing.f.solo.8") || "PDF export & invoicing tools",
    t("pricing.f.solo.9") || "Payment links & online payments",
    t("pricing.f.solo.10") || "Client & booking management",
    t("pricing.f.solo.11") || "Airbnb / Booking / OTA sync",
    t("pricing.f.solo.12") || "Worldwide service visibility",
    t("pricing.f.solo.13") || "Secure document archive",
  ];
  const TEAM_FEATURES = [
    t("pricing.f.team.0") || "Everything in Solo",
    t("pricing.f.team.1") || "Up to 10 employees",
    t("pricing.f.team.2") || "Team access & collaboration",
    t("pricing.f.team.3") || "Shared business management",
    t("pricing.f.team.4") || "Shared calendar & bookings",
    t("pricing.f.team.5") || "Multi-service & multi-property",
    t("pricing.f.team.6") || "Shared communication center",
    t("pricing.f.team.7") || "Priority support",
    t("pricing.f.team.8") || "Cross-city & cross-country organization",
  ];
  const COMPANY_FEATURES = [
    t("pricing.f.company.0") || "Everything in Team",
    t("pricing.f.company.1") || "Up to 50 employees",
    t("pricing.f.company.2") || "Multi-country business management",
    t("pricing.f.company.3") || "Advanced team structure",
    t("pricing.f.company.4") || "Multi-location operations",
    t("pricing.f.company.5") || "High-volume listings & services",
    t("pricing.f.company.6") || "Scalable business workflows",
    t("pricing.f.company.7") || "Stronger company management tools",
    t("pricing.f.company.8") || "Dedicated priority support",
  ];
  return { FREE_FEATURES, SOLO_FEATURES, TEAM_FEATURES, COMPANY_FEATURES };
};

interface TierData {
  name: string; subtitle: string; audience: string;
  icon: React.ReactNode; monthly: number; annual: number;
  features: string[]; highlight?: boolean; badge?: string;
}

const TIER_ICONS = [
  <Zap className="h-5 w-5" />,
  <User className="h-5 w-5" />,
  <Users className="h-5 w-5" />,
  <Building2 className="h-5 w-5" />,
];

const TRUST_SIGNALS_DATA = [
  { icon: <BadgePercent className="h-5 w-5" />, labelKey: "pricing.trust.commission", labelFb: "0% commission", subKey: "pricing.trust.commission_sub", subFb: "Keep 100% of your revenue" },
  { icon: <Globe className="h-5 w-5" />, labelKey: "pricing.trust.countries", labelFb: "190+ countries", subKey: "pricing.trust.countries_sub", subFb: "Worldwide coverage" },
  { icon: <ShieldCheck className="h-5 w-5" />, labelKey: "pricing.trust.payments", labelFb: "Secure payments", subKey: "pricing.trust.payments_sub", subFb: "Stripe-powered billing" },
  { icon: <Star className="h-5 w-5" />, labelKey: "pricing.trust.cancel", labelFb: "Cancel anytime", subKey: "pricing.trust.cancel_sub", subFb: "No lock-in contract" },
];

const Pricing = () => {
  const { t } = useI18n();
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const { FREE_FEATURES, SOLO_FEATURES, TEAM_FEATURES, COMPANY_FEATURES } = usePricingFeatures(t);

  const TIERS: TierData[] = [
    { name: "Free", subtitle: t("pricing.tier.free.sub") || "Publish & share for free", audience: t("pricing.tier.free.audience") || "For anyone getting started", icon: TIER_ICONS[0], monthly: 0, annual: 0, features: FREE_FEATURES },
    { name: "Solo", subtitle: t("pricing.tier.solo.sub") || "All-in-one business starter", audience: t("pricing.tier.solo.audience") || "Entrepreneurs & freelancers", icon: TIER_ICONS[1], monthly: 9.99, annual: 99, features: SOLO_FEATURES, badge: t("pricing.badge_value") || "Best value" },
    { name: "Team", subtitle: t("pricing.tier.team.sub") || "Grow your business together", audience: t("pricing.tier.team.audience") || "Small companies & agencies", icon: TIER_ICONS[2], monthly: 29, annual: 299, features: TEAM_FEATURES, highlight: true, badge: t("pricing.badge_popular") || "Most popular" },
    { name: "Company", subtitle: t("pricing.tier.company.sub") || "Scale without limits", audience: t("pricing.tier.company.audience") || "Agencies & larger businesses", icon: TIER_ICONS[3], monthly: 99, annual: 999, features: COMPANY_FEATURES, badge: t("pricing.badge_enterprise") || "Enterprise" },
  ];

  const TRUST_SIGNALS = TRUST_SIGNALS_DATA.map(s => ({
    icon: s.icon,
    label: t(s.labelKey) || s.labelFb,
    sub: t(s.subKey) || s.subFb,
  }));

  return (
    <section id="pricing" className="py-16 sm:py-24 relative overflow-hidden">
      {/* Background dots */}
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
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/50 text-center hover:border-accent/20 transition-colors"
            >
              <div className="text-accent">{s.icon}</div>
              <span className="text-xs font-bold text-foreground">{s.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{s.sub}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Toggle — enhanced */}
        <div className="flex items-center justify-center mb-10">
          <div className="relative flex items-center bg-muted/50 rounded-full p-1 border border-border/50">
            {(["monthly", "annual"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setInterval(v)}
                className={`relative px-6 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all duration-300 z-10 ${
                  interval === v ? "text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "monthly" ? (t("pricing.monthly") || "Monthly") : (t("pricing.annual") || "Annual")}
                {v === "annual" && interval === "annual" && (
                  <span className="absolute -top-2 -right-1 bg-success text-success-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-scale-in">
                    -17%
                  </span>
                )}
              </button>
            ))}
            {/* Sliding pill */}
            <motion.div
              className="absolute top-1 bottom-1 rounded-full bg-foreground shadow-lg"
              animate={{ left: interval === "monthly" ? 4 : "50%", right: interval === "annual" ? 4 : "50%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
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
                className={`group relative bg-card rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ${
                  isHighlight
                    ? "border-2 border-primary shadow-xl shadow-primary/10 lg:-mt-3 lg:mb-3"
                    : "border border-border hover:border-accent/30 hover:shadow-lg"
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
                    <div className={`p-2 rounded-xl transition-colors ${
                      isHighlight ? "bg-primary/10 text-primary group-hover:bg-primary/15" :
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

                  {/* Price with animation */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${tier.name}-${price}`}
                          initial={{ opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 12 }}
                          transition={{ duration: 0.2 }}
                          className="text-4xl font-black text-foreground tracking-tight"
                        >
                          {price === 0 ? "0" : price}€
                        </motion.span>
                      </AnimatePresence>
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
                        <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isHighlight ? "text-primary" : "text-success"}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    to="/signup"
                    className={`flex items-center justify-center gap-2 w-full py-3 min-h-[44px] rounded-xl font-semibold text-sm transition-all duration-200 group/btn ${
                      isHighlight
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20"
                        : tier.name === "Company"
                        ? "bg-gradient-to-r from-accent to-gold-dark text-accent-foreground hover:opacity-90 shadow-md shadow-accent/20"
                        : isFree
                        ? "bg-muted text-foreground hover:bg-muted/80 border border-border"
                        : "bg-accent text-accent-foreground hover:opacity-90"
                    }`}
                  >
                    {isFree ? (t("pricing.cta_free") || "Get started free") : (t("pricing.cta_trial") || "Start free trial")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="mt-12 space-y-6">
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

          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground max-w-xl mx-auto">
              {t("pricing.audience") || "Built for property owners, entrepreneurs, freelancers, service providers, agencies & companies in 190+ countries."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">💳 Credit card</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:block" />
              <span className="flex items-center gap-1">🏦 SEPA</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:block" />
              <span className="flex items-center gap-1"> Apple Pay</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:block" />
              <span className="flex items-center gap-1">🟢 Google Pay</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
