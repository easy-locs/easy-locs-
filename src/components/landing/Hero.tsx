import { motion } from "framer-motion";
import { ArrowRight, Globe, Shield, FileText, Building2, Users, Star, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const Hero = () => {
  const { t } = useI18n();

  const trustItems = [
    { icon: Globe, label: t("landing.hero.trust_countries") || "110+ pays" },
    { icon: Shield, label: t("landing.hero.trust_gdpr") || "Conforme RGPD" },
    { icon: FileText, label: t("landing.hero.trust_legal") || "Documents légaux" },
    { icon: Users, label: t("landing.hero.trust_portal") || "Portail locataire" },
  ];

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden" style={{ background: 'hsl(var(--navy-deep))' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-navy-deep via-navy-deep/95 to-navy/80" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary-foreground)) 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      <div className="container relative z-10 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm text-gold-light mb-8">
            <Star className="h-3.5 w-3.5" />
            <span>{t("landing.hero.badge") || "Gestion immobilière mondiale"}</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary-foreground leading-[1.1] mb-6">
            {t("landing.hero.title") || "Gérez vos biens"}{" "}
            <span className="text-gradient-gold">{t("landing.hero.title_highlight") || "partout dans le monde"}</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
            className="text-lg text-primary-foreground/60 mb-10 max-w-xl mx-auto leading-relaxed">
            {t("landing.hero.subtitle") || "Baux, quittances, comptabilité — conformes à la législation de chaque pays. Simple, rapide, professionnel."}
          </motion.p>

          {/* Two CTAs: Pro + Tenant */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link to="/onboarding"
              className="inline-flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-8 py-3.5 rounded-xl shadow-gold hover:opacity-90 transition-opacity text-base">
              <Building2 className="h-4 w-4" />
              {t("landing.hero.cta_pro") || "Espace propriétaire"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/tenant-signup"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/15 text-primary-foreground/80 font-medium px-8 py-3.5 rounded-xl hover:bg-primary-foreground/5 transition-colors text-base">
              <KeyRound className="h-4 w-4" />
              {t("landing.hero.cta_tenant") || "Espace locataire"}
            </Link>
          </motion.div>

          {/* Pricing link */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.28 }}
            className="mb-14">
            <a href="#pricing" className="text-sm text-primary-foreground/40 hover:text-primary-foreground/60 transition-colors underline underline-offset-4">
              {t("landing.hero.pricing") || "Voir les tarifs"}
            </a>
          </motion.div>

          {/* Trust bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.35 }}
            className="flex items-center justify-center gap-6 sm:gap-8 flex-wrap">
            {trustItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-primary-foreground/40 text-sm">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
