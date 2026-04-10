import { motion } from "framer-motion";
import { Globe, Languages, Banknote, FileCheck, Cpu, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const AdvantagesSection = () => {
  const { t } = useI18n();

  const advantages = [
    { icon: Globe, title: t("landing.advantages.worldwide"), desc: t("landing.advantages.worldwide_desc"), color: "info" },
    { icon: Languages, title: t("landing.advantages.languages"), desc: t("landing.advantages.languages_desc"), color: "accent" },
    { icon: Banknote, title: t("landing.advantages.currency"), desc: t("landing.advantages.currency_desc"), color: "success" },
    { icon: FileCheck, title: t("landing.advantages.documents"), desc: t("landing.advantages.documents_desc"), color: "warning" },
    { icon: Cpu, title: t("landing.advantages.ai"), desc: t("landing.advantages.ai_desc"), color: "info" },
    { icon: ShieldCheck, title: t("landing.advantages.security"), desc: t("landing.advantages.security_desc"), color: "destructive" },
  ];

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.4) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[150px] pointer-events-none" />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
            style={{ color: "hsl(var(--gold-light))", background: "hsl(var(--accent) / 0.1)", borderColor: "hsl(var(--accent) / 0.25)" }}
          >
            {t("landing.advantages.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight" style={{ color: "hsl(var(--primary-foreground))" }}>
            {t("landing.advantages.title")} <span className="text-gradient-gold">{t("landing.advantages.title_highlight")}</span>
          </h2>
          <p className="text-base sm:text-lg max-w-lg mx-auto" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>
            {t("landing.advantages.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {advantages.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -5 }}
              className="group rounded-2xl p-6 border transition-all duration-300 relative overflow-hidden"
              style={{ borderColor: "hsl(var(--primary-foreground) / 0.06)", background: "hsl(var(--primary-foreground) / 0.03)" }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${a.color})), transparent)` }}
              />
              <div className="relative z-10">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `hsl(var(--${a.color}) / 0.12)` }}
                >
                  <a.icon className="h-5 w-5" style={{ color: `hsl(var(--${a.color}))` }} />
                </div>
                <h3 className="font-bold text-sm mb-1.5" style={{ color: "hsl(var(--primary-foreground))" }}>{a.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--primary-foreground) / 0.45)" }}>{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            to="/signup"
            className="group inline-flex items-center gap-2.5 font-bold px-8 py-3.5 rounded-xl transition-all text-sm relative overflow-hidden"
            style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 30px hsl(var(--accent) / 0.25)" }}
          >
            <span className="relative z-10 flex items-center gap-2">
              {t("landing.advantages.cta")}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default AdvantagesSection;
