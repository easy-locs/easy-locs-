import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { BadgePercent, Shield, Globe, Zap, ArrowRight, Headphones, FileText, BarChart3 } from "lucide-react";

const ADVANTAGES = [
  {
    icon: BadgePercent,
    title: "0% Commission",
    desc: "Keep 100% of your revenue. No hidden fees, no transaction commissions.",
    color: "success",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    desc: "GDPR compliant, encrypted data, and localized legal documents in 31 languages.",
    color: "info",
  },
  {
    icon: Globe,
    title: "110+ Countries",
    desc: "Manage properties and services across every continent from one dashboard.",
    color: "accent",
  },
  {
    icon: Zap,
    title: "All-in-One Platform",
    desc: "Rentals, bookings, marketplace, documents, payments — everything in one place.",
    color: "warning",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "Dedicated support team available around the clock to help you succeed.",
    color: "info",
  },
  {
    icon: FileText,
    title: "Smart Documents",
    desc: "AI-powered lease generation, rent receipts, and legal notices — country-specific.",
    color: "accent",
  },
];

const QUICK_LINKS = [
  { label: "Property Management", to: "/property-management" },
  { label: "Seasonal Rentals", to: "/seasonal-rentals" },
  { label: "Marketplace Services", to: "/marketplace-services" },
  { label: "Concierge", to: "/concierge-services" },
  { label: "Pricing", to: "/#pricing" },
  { label: "Help Center", to: "/help" },
];

export default function ValueProposition() {
  const { t } = useI18n();

  return (
    <section className="py-20 sm:py-28 bg-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />

      <div className="container max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
            whileHover={{ scale: 1.05 }}
          >
            <BadgePercent className="h-3.5 w-3.5" />
            {t("landing.value.badge") || "Why Easy-Locs"}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("landing.value.title") || "The Platform That"}{" "}
            <span className="text-accent">{t("landing.value.highlight") || "Works For You"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t("landing.value.subtitle") || "Zero commission, full control. Everything you need to build a global property and service business."}
          </p>
        </motion.div>

        {/* Advantage cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {ADVANTAGES.map((adv, i) => (
            <motion.div
              key={adv.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group bg-card border border-border/50 rounded-2xl p-6 hover:border-accent/25 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
            >
              <motion.div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${adv.color})), transparent)` }}
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `hsl(var(--${adv.color}) / 0.1)` }}
              >
                <adv.icon className="h-6 w-6" style={{ color: `hsl(var(--${adv.color}))` }} />
              </div>
              <h3 className="font-bold text-foreground mb-2">{adv.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{adv.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick links bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-bold text-foreground text-lg">{t("landing.value.quick_links") || "Quick Links"}</h3>
              <p className="text-sm text-muted-foreground">{t("landing.value.quick_links_desc") || "Jump to the section that matters to you"}</p>
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline shrink-0"
            >
              {t("landing.value.get_started") || "Get Started Free"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm font-medium text-muted-foreground hover:text-accent px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-accent/10 transition-all text-center border border-transparent hover:border-accent/20"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
