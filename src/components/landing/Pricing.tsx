import { motion } from "framer-motion";
import { Check, Sparkles, User, Users, Building2, Zap, BadgePercent, Globe, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

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
  color: string;
  btnClass: string;
}

const TIERS: TierData[] = [
  {
    name: "Free",
    subtitle: "Publish & share for free",
    audience: "For anyone getting started",
    icon: <Zap className="h-5 w-5" />,
    monthly: 0,
    annual: 0,
    features: FREE_FEATURES,
    color: "border-border",
    btnClass: "bg-muted text-muted-foreground hover:bg-muted/80",
  },
  {
    name: "Solo",
    subtitle: "All-in-one business starter",
    audience: "For entrepreneurs & freelancers",
    icon: <User className="h-5 w-5" />,
    monthly: 9.99,
    annual: 99,
    features: SOLO_FEATURES,
    color: "border-accent/30",
    btnClass: "bg-accent text-accent-foreground hover:opacity-90",
  },
  {
    name: "Team",
    subtitle: "Grow your business together",
    audience: "For small companies & agencies",
    icon: <Users className="h-5 w-5" />,
    monthly: 29,
    annual: 299,
    features: TEAM_FEATURES,
    highlight: true,
    color: "border-primary/40 ring-2 ring-primary/20",
    btnClass: "bg-primary text-primary-foreground hover:opacity-90",
  },
  {
    name: "Company",
    subtitle: "Scale without limits",
    audience: "For agencies & larger businesses",
    icon: <Building2 className="h-5 w-5" />,
    monthly: 99,
    annual: 999,
    features: COMPANY_FEATURES,
    color: "border-gold/40",
    btnClass: "bg-gradient-gold text-accent-foreground hover:opacity-90",
  },
];

const Pricing = () => {
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");

  return (
    <section id="pricing" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div className="container max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-6 space-y-3"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
            Simple Pricing, <span className="text-gradient-gold">Powerful Tools</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Manage your properties, services, bookings, documents and payments worldwide.
          </p>
          <p className="text-muted-foreground text-sm">
            No commitment — Cancel anytime
          </p>
        </motion.div>

        {/* 0% Commission badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-8 py-3 px-5 rounded-2xl bg-success/10 border border-success/20 max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-success shrink-0" />
            <span className="font-bold text-success text-sm">0% commission on your revenue</span>
          </div>
          <span className="hidden sm:block text-success/40">|</span>
          <span className="text-success/80 text-xs text-center">Keep 100% of your earnings — we provide the tools, you keep the income</span>
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
              {v === "monthly" ? "Monthly" : "Annual"}
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
            const intLabel = interval === "monthly" ? "mo" : "yr";
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

                <div className="flex items-center gap-2 mb-0.5">
                  {tier.icon}
                  <h3 className="font-bold text-foreground text-lg">{tier.name}</h3>
                </div>

                <p className="text-xs font-semibold text-foreground/80 mb-0.5">{tier.subtitle}</p>
                <p className="text-[11px] text-muted-foreground mb-3">{tier.audience}</p>

                <div className="mb-4">
                  <motion.span
                    key={`${tier.name}-${price}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-3xl font-extrabold text-foreground"
                  >
                    {price === 0 ? "0" : price}€
                  </motion.span>
                  <span className="text-muted-foreground text-sm ml-1">/{tier.monthly === 0 ? "forever" : intLabel}</span>
                  {interval === "annual" && tier.monthly > 0 && (
                    <span className="block text-[10px] text-success font-medium mt-0.5">
                      Save {Math.round((1 - tier.annual / (tier.monthly * 12)) * 100)}% vs monthly
                    </span>
                  )}
                </div>

                <ul className="space-y-1.5 mb-5 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-tight">
                      <Check className="h-3 w-3 text-success shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/signup"
                    className={`block w-full text-center py-2.5 rounded-xl font-semibold text-xs transition-all ${tier.btnClass}`}
                  >
                    {tier.monthly === 0 ? "Get started free" : "Start free trial"}
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Audience message */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground mt-6 max-w-xl mx-auto"
        >
          Built for property owners, entrepreneurs, freelancers, service providers, agencies & companies worldwide.
        </motion.p>

        {/* Payment methods */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span>💳 Credit card</span>
          <span>🏦 SEPA</span>
          <span> Apple Pay</span>
          <span>🟢 Google Pay</span>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
