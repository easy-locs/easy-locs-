/**
 * LandingFAQ — Visible FAQ section for landing page SEO.
 * Mirrors the JSON-LD FAQPage structured data with rendered content.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const faqs = [
  {
    qKey: "landing.faq.q1",
    aKey: "landing.faq.a1",
    qFallback: "Can I manage property and service businesses remotely with Easy-Locs?",
    aFallback: "Yes. Easy-Locs allows entrepreneurs to create and manage rental properties, accept direct bookings, and run service businesses in multiple cities worldwide — all remotely from a single platform. Whether you're in Paris managing a property in Dubai, or running a cleaning business across three countries, Easy-Locs provides the tools you need.",
  },
  {
    qKey: "landing.faq.q2",
    aKey: "landing.faq.a2",
    qFallback: "What types of businesses can I run on Easy-Locs?",
    aFallback: "You can manage long-term rental properties (leases, rent collection, tenant management), accept direct short-term bookings without intermediary platforms, and run service businesses like cleaning, car rental, concierge services, activities, tours, and maintenance across multiple cities.",
  },
  {
    qKey: "landing.faq.q3",
    aKey: "landing.faq.a3",
    qFallback: "How many countries does Easy-Locs support?",
    aFallback: "Easy-Locs supports operations in over 110 countries with localized compliance, 120+ currencies, and documents available in 31 languages. From Europe to Asia, Middle East to the Americas — you can operate anywhere.",
  },
  {
    qKey: "landing.faq.q4",
    aKey: "landing.faq.a4",
    qFallback: "Is Easy-Locs free to start?",
    aFallback: "Yes, Easy-Locs offers a free trial with full access to all features. After that, plans start at €9.99/month with unlimited properties, tenants, and services included. No hidden fees, no commission on your revenue.",
  },
  {
    qKey: "landing.faq.q5",
    aKey: "landing.faq.a5",
    qFallback: "How do payments work on the platform?",
    aFallback: "Easy-Locs supports multiple payment methods: credit cards (Visa, Mastercard, Apple Pay, Google Pay), SEPA direct debit for European countries, bank transfers with automatic reference tracking, and custom payment links. All payments go directly to your account — we never hold your money.",
  },
  {
    qKey: "landing.faq.q6",
    aKey: "landing.faq.a6",
    qFallback: "Can I generate legal documents like leases and receipts?",
    aFallback: "Yes. Easy-Locs generates country-specific legal documents including residential leases, rent receipts, inventory reports, and formal notices. All documents are compliant with local regulations and available in multiple languages. AI-assisted generation makes it even faster.",
  },
];

const LandingFAQ = () => {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/[0.02] blur-[100px] pointer-events-none" />

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

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className={`rounded-xl border transition-all duration-200 ${
                    isOpen ? "border-accent/25 bg-accent/[0.03]" : "border-border/50 bg-card"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-3 p-5 text-left"
                  >
                    <span className={`text-sm font-semibold transition-colors ${isOpen ? "text-foreground" : "text-foreground/80"}`}>
                      {t(faq.qKey) || faq.qFallback}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
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
