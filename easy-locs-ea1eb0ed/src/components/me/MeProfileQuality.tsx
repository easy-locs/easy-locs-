import { useMemo, memo } from "react";
import { CSS } from "@/config/ui";
import { useI18n } from "@/lib/i18n";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface QualityCheck {
  key: string;
  label: string;
  passed: boolean;
}

interface Props {
  shopName?: string | null;
  hasDescription?: boolean;
  hasLogo?: boolean;
  hasCover?: boolean;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasAddress?: boolean;
  hasCategories?: boolean;
  hasHours?: boolean;
  hasWallet?: boolean;
  isVerified?: boolean;
}

function MeProfileQuality(props: Props) {
  const { t } = useI18n();

  const checks = useMemo<QualityCheck[]>(() => [
    { key: "name", label: t("me.quality_identity"), passed: !!(props.shopName && props.shopName.length > 2) },
    { key: "desc", label: t("me.quality_description"), passed: !!props.hasDescription },
    { key: "logo", label: t("me.quality_logo"), passed: !!props.hasLogo },
    { key: "cover", label: t("me.quality_cover"), passed: !!props.hasCover },
    { key: "phone", label: t("me.quality_phone"), passed: !!props.hasPhone },
    { key: "email", label: t("me.quality_email"), passed: !!props.hasEmail },
    { key: "address", label: t("me.quality_address"), passed: !!props.hasAddress },
    { key: "categories", label: t("me.quality_categories"), passed: !!props.hasCategories },
    { key: "hours", label: t("me.quality_hours"), passed: !!props.hasHours },
    { key: "wallet", label: t("me.quality_wallet"), passed: !!props.hasWallet },
  ], [props, t]);

  const score = useMemo(() => {
    const passed = checks.filter(c => c.passed).length;
    return Math.round((passed / checks.length) * 100);
  }, [checks]);

  const missing = checks.filter(c => !c.passed);

  const strokeColor = score >= 80 ? "hsl(152 60% 42%)" : score >= 50 ? "hsl(var(--accent))" : "hsl(350 65% 55%)";

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`${CSS.appCard} p-4`}>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(226 24% 14% / 0.06)" strokeWidth="6" />
            <motion.circle
              cx="40" cy="40" r={radius} fill="none"
              stroke={strokeColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-extrabold text-foreground tabular-nums">{score}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[0.8125rem] font-bold text-foreground">{t("me.profile_quality")}</p>
          <p className="text-[0.625rem] text-muted-foreground mt-0.5">
            {score >= 80
              ? t("me.quality_excellent")
              : score >= 50
                ? t("me.quality_good")
                : t("me.quality_needs_work")
            }
          </p>
          {missing.length > 0 && (
            <div className="mt-2 space-y-1">
              {missing.slice(0, 3).map(m => (
                <div key={m.key} className="flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-[0.625rem] text-muted-foreground truncate">{m.label}</span>
                </div>
              ))}
              {missing.length > 3 && (
                <span className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--accent))" }}>
                  +{missing.length - 3} {t("me.quality_more")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MeProfileQuality);
