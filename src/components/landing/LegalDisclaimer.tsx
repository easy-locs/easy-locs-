import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const LegalDisclaimer = () => {
  const { t } = useI18n();
  return (
    <section className="py-12 bg-muted/50">
      <div className="container">
        <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-6 max-w-3xl mx-auto shadow-card">
          <AlertTriangle className="h-6 w-6 text-gold shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground mb-1">{t("landing.legal.title")}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("landing.legal.text")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LegalDisclaimer;