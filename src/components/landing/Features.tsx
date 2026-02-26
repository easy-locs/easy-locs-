import { motion } from "framer-motion";
import { FileText, Home, Bell, FolderLock, BrainCircuit, Building2, Send, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const featureKeys = [
  { icon: FileText, titleKey: "page.features.receipt_title", descKey: "page.features.receipt_desc" },
  { icon: Home, titleKey: "page.features.lease_title", descKey: "page.features.lease_desc" },
  { icon: Building2, titleKey: "page.features.company_title", descKey: "page.features.company_desc" },
  { icon: Send, titleKey: "page.features.admin_title", descKey: "page.features.admin_desc" },
  { icon: Bell, titleKey: "page.features.reminder_title", descKey: "page.features.reminder_desc" },
  { icon: FolderLock, titleKey: "page.features.vault_title", descKey: "page.features.vault_desc" },
  { icon: BrainCircuit, titleKey: "page.features.ai_title", descKey: "page.features.ai_desc" },
  { icon: Share2, titleKey: "page.features.share_title", descKey: "page.features.share_desc" },
];

const Features = () => {
  const { t } = useI18n();

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("page.features.heading")} <span className="text-gradient-gold">{t("page.features.heading_highlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("page.features.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureKeys.map((feature, i) => (
            <motion.div key={feature.titleKey} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="group bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50">
              <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t(feature.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
