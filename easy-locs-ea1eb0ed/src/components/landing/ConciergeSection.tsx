import { motion } from "framer-motion";
import { ConciergeBell, CalendarRange, CreditCard, Camera, Share2, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const ConciergeSection = () => {
  const { t } = useI18n();

  const features = [
    { icon: ConciergeBell, title: t("landing.concierge.catalog"), desc: t("landing.concierge.catalog_desc"), color: "accent" },
    { icon: CalendarRange, title: t("landing.concierge.calendar"), desc: t("landing.concierge.calendar_desc"), color: "info" },
    { icon: CreditCard, title: t("landing.concierge.payment"), desc: t("landing.concierge.payment_desc"), color: "success" },
    { icon: Camera, title: t("landing.concierge.photos"), desc: t("landing.concierge.photos_desc"), color: "warning" },
    { icon: Share2, title: t("landing.concierge.share"), desc: t("landing.concierge.share_desc"), color: "info" },
    { icon: ShieldCheck, title: t("landing.concierge.docs"), desc: t("landing.concierge.docs_desc"), color: "accent" },
  ];

  return (
    <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
      <div className="container max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
              <ConciergeBell className="h-3.5 w-3.5" />
              {t("landing.concierge.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
              {t("landing.concierge.title")}{" "}
              <span className="text-gradient-gold">{t("landing.concierge.title_highlight")}</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg">
              {t("landing.concierge.subtitle")}
            </p>
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 text-sm font-bold text-accent hover:gap-3 transition-all"
            >
              {t("landing.concierge.cta")}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Right cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="group bg-card border border-border/50 rounded-2xl p-5 hover:border-accent/25 transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                  style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${f.color})), transparent)` }}
                />
                <div className="relative z-10">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `hsl(var(--${f.color}) / 0.1)` }}
                  >
                    <f.icon className="h-4 w-4" style={{ color: `hsl(var(--${f.color}))` }} />
                  </div>
                  <h4 className="font-bold text-foreground text-sm mb-1">{f.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConciergeSection;
