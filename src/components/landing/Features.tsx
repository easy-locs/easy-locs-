import { motion } from "framer-motion";
import { FileText, Home, Bell, Building2, Send, Share2, BrainCircuit, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const featureKeys = [
  { icon: FileText, titleKey: "page.features.receipt_title", descKey: "page.features.receipt_desc" },
  { icon: Home, titleKey: "page.features.lease_title", descKey: "page.features.lease_desc" },
  { icon: Building2, titleKey: "page.features.company_title", descKey: "page.features.company_desc" },
  { icon: Send, titleKey: "page.features.admin_title", descKey: "page.features.admin_desc" },
  { icon: Bell, titleKey: "page.features.reminder_title", descKey: "page.features.reminder_desc" },
  { icon: Shield, titleKey: "page.features.vault_title", descKey: "page.features.vault_desc" },
  { icon: BrainCircuit, titleKey: "page.features.ai_title", descKey: "page.features.ai_desc" },
  { icon: Share2, titleKey: "page.features.share_title", descKey: "page.features.share_desc" },
];

const Features = () => {
  const { t } = useI18n();

  return (
    <section id="features" className="py-20 sm:py-24 bg-background">
      <div className="container max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {t("page.features.heading")} <span className="text-gradient-gold">{t("page.features.heading_highlight")}</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">{t("page.features.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureKeys.map((feature, i) => (
            <motion.div key={feature.titleKey} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              className="group bg-card rounded-xl p-5 border border-border/50 hover:border-accent/30 hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1.5">{t(feature.titleKey)}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
