/**
 * LandingFAQ — Premium FAQ section with staggered accordion animations.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, Plus, Minus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const faqs = [
  {
    qKey: "landing.faq.q1", aKey: "landing.faq.a1",
    qFallback: "Can I manage property and service businesses remotely with Easy-Locs?",
    aFallback: "Yes. Easy-Locs allows entrepreneurs to create and manage rental properties, accept direct bookings, and run service businesses in multiple cities worldwide — all remotely from a single platform. Whether you're in Paris managing a property in Dubai, or running a cleaning business across three countries, Easy-Locs provides the tools you need.",
  },
  {
    qKey: "landing.faq.q2", aKey: "landing.faq.a2",
    qFallback: "What types of businesses can I run on Easy-Locs?",
    aFallback: "You can manage long-term rental properties (leases, rent collection, tenant management), accept direct short-term bookings without intermediary platforms, and run service businesses like cleaning, car rental, concierge services, activities, tours, and maintenance across multiple cities.",
  },
  {
    qKey: "landing.faq.q3", aKey: "landing.faq.a3",
    qFallback: "How many countries does Easy-Locs support?",
    aFallback: "Easy-Locs supports operations in over 110 countries with localized compliance, 120+ currencies, and documents available in 31 languages. From Europe to Asia, Middle East to the Americas — you can operate anywhere.",
  },
  {
    qKey: "landing.faq.q4", aKey: "landing.faq.a4",
    qFallback: "Is Easy-Locs free to start?",
    aFallback: "Yes, Easy-Locs offers a free trial with full access to all features. After that, plans start at €9.99/month with unlimited properties, tenants, and services included. No hidden fees, no commission on your revenue.",
  },
  {
    qKey: "landing.faq.q5", aKey: "landing.faq.a5",
    qFallback: "How do payments work on the platform?",
    aFallback: "Easy-Locs supports multiple payment methods: credit cards (Visa, Mastercard, Apple Pay, Google Pay), SEPA direct debit for European countries, bank transfers with automatic reference tracking, and custom payment links. All payments go directly to your account — we never hold your money.",
  },
  {
    qKey: "landing.faq.q6", aKey: "landing.faq.a6",
    qFallback: "Can I generate legal documents like leases and receipts?",
    aFallback: "Yes. Easy-Locs generates country-specific legal documents including residential leases, rent receipts, inventory reports, and formal notices. All documents are compliant with local regulations and available in multiple languages. AI-assisted generation makes it even faster.",
  },
];

const LandingFAQ = () => {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.03] pointer-events-none" style={{
        background: "radial-gradient(ellipse, hsl(var(--accent)), transparent 70%)",
      }} />

      <div className="container max-w-3xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-12 space-y-4"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
            whileHover={{ scale: 1.05 }}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {t("landing.faq.badge") || "FAQ"}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
            {t("landing.faq.title") || "Frequently Asked"}{" "}
            <span className="text-gradient-gold">{t("landing.faq.highlight") || "Questions"}</span>
          </h2>
        </motion.div>

        <div className="space-y-2.5">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className={`rounded-xl border transition-all duration-300 ${
                    isOpen
                      ? "border-accent/25 bg-accent/[0.03] shadow-lg shadow-accent/[0.03]"
                      : "border-border/50 bg-card hover:border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 min-h-[44px] text-left group"
                  >
                    <span className={`text-sm font-semibold transition-colors ${isOpen ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"}`}>
                      {t(faq.qKey) || faq.qFallback}
                    </span>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isOpen ? "bg-accent/10 text-accent rotate-0" : "bg-muted text-muted-foreground"
                    }`}>
                      {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                          {t(faq.aKey) || faq.aFallback}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingFAQ;
