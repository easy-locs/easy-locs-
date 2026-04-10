import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const LegalDisclaimer = () => {
  const { t } = useI18n();

  return (
    <section className="py-10">
      <div className="container max-w-2xl">
        <div className="flex items-start gap-4 bg-card border border-border/50 rounded-xl p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <AlertTriangle className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-1">{t("landing.legal.title")}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("landing.legal.text")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LegalDisclaimer;
