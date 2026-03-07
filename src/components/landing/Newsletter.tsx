import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
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
      const { error } = await supabase.from("newsletter_subscribers" as any).insert({ email } as any);
      if (error && error.code === "23505") {
        toast.info(t("newsletter.already_subscribed"));
      } else if (error) {
        throw error;
      }
      setSubmitted(true);
      setEmail("");
    } catch {
      toast.error(t("newsletter.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container max-w-xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            <Sparkles className="h-3.5 w-3.5" />
            {t("newsletter.badge")}
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">{t("newsletter.title")}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t("newsletter.subtitle")}</p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2 text-success font-medium"
            >
              <CheckCircle className="h-5 w-5" />
              {t("newsletter.success")}
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("newsletter.placeholder")}
                  className="w-full pl-10 pr-4 h-12 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex items-center justify-center gap-2 font-bold px-6 h-12 rounded-xl transition-all disabled:opacity-50 text-sm relative overflow-hidden"
                style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 16px hsl(var(--accent) / 0.15)" }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t("newsletter.cta")}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Newsletter;
