import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Legal disclaimer for the marketplace intermediation model.
 * Displayed on service pages and booking flows.
 */
export default function MarketplaceDisclaimer({ compact }: { compact?: boolean }) {
  const { t } = useI18n();

  if (compact) {
    return (
      <p className="marketplace-disclaimer text-[10px] text-muted-foreground text-center leading-relaxed flex items-center justify-center gap-1 flex-wrap">
        <Shield className="inline h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span>{t("mp.disclaimer_short") || "Payment is made directly to the provider. Easy-Locs acts only as a connection platform."}</span>
      </p>
    );
  }

  return (
    <div className="bg-muted/30 border border-border/40 rounded-xl p-3 sm:p-4 space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Shield className="h-4 w-4 text-accent shrink-0" />
        <span>{t("mp.disclaimer_title") || "Direct Payment"}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("mp.disclaimer_full") || "Payment is made directly to the service provider. Easy-Locs is a connection platform and does not process, collect, or hold any payment on behalf of users."}
      </p>
    </div>
  );
}
