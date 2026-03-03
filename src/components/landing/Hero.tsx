import { motion } from "framer-motion";
import { ArrowRight, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { useI18n } from "@/lib/i18n";

const Hero = () => {
  const { t } = useI18n();
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-hero">
      <div className="absolute inset-0 opacity-[0.05] bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy-deep/50 to-navy-deep/95" />

      <div className="container relative z-10 py-20">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm text-gold-light mb-6">
            <Globe className="h-4 w-4" />
            <span>{t("landing.hero.badge")}</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary-foreground leading-tight mb-6">
            {t("landing.hero.title")}{" "}
            <span className="text-gradient-gold">{t("landing.hero.title_highlight")}</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-primary-foreground/70 mb-10 max-w-2xl leading-relaxed">
            {t("landing.hero.subtitle")}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4">
            <Link to="/onboarding"
              className="inline-flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-8 py-4 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-lg">
              {t("landing.hero.cta")}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a href="#pricing"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/20 text-primary-foreground font-medium px-8 py-4 rounded-lg hover:bg-primary-foreground/5 transition-colors text-lg">
              {t("landing.hero.pricing")}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;