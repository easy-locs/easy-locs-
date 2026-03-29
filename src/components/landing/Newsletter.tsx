import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import * as newsletterRepo from "@/repositories/newsletter.repository";
import { toast } from "sonner";

const Newsletter = () => {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
      const result = await newsletterRepo.subscribe(email);
      if (result === "already_subscribed") {
        toast.info(t("newsletter.already_subscribed") || "You're already subscribed!");
      }
      setSubmitted(true);
      setEmail("");
    } catch {
      toast.error(t("newsletter.error") || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-accent/[0.04] blur-[120px] pointer-events-none" />

      <div className="container max-w-xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-6"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
            style={{ color: "hsl(var(--gold-light))", background: "hsl(var(--accent) / 0.1)", borderColor: "hsl(var(--accent) / 0.25)" }}
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("newsletter.badge") || "Stay Updated"}
          </motion.span>

          <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "hsl(var(--primary-foreground))" }}>
            {t("newsletter.title") || "Get the Latest Updates"}
          </h2>
          <p className="text-sm sm:text-base" style={{ color: "hsl(var(--primary-foreground) / 0.65)" }}>
            {t("newsletter.subtitle") || "Join thousands of entrepreneurs. Tips, features & industry insights delivered weekly."}
          </p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2 text-success font-medium"
            >
              <CheckCircle className="h-5 w-5" />
              {t("newsletter.success") || "You're subscribed! 🎉"}
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("newsletter.placeholder") || "your@email.com"}
                  className="w-full pl-10 pr-4 h-12 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  style={{
                    background: "hsl(var(--primary-foreground) / 0.06)",
                    borderColor: "hsl(var(--primary-foreground) / 0.12)",
                    color: "hsl(var(--primary-foreground))",
                  }}
                />
              </div>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center justify-center gap-2 font-bold px-6 h-12 rounded-xl transition-all disabled:opacity-50 text-sm relative overflow-hidden"
                style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 16px hsl(var(--accent) / 0.2)" }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t("newsletter.cta") || "Subscribe"}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Newsletter;
