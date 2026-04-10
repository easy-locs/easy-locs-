import { type TrustLevel, TRUST_LEVELS, getProgressToNextLevel, getEffectiveLimits } from "@/lib/trust/trust-levels";
import { type SecurityFlag } from "@/lib/trust/trust-levels";
import { useI18n } from "@/lib/i18n";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, ChevronRight } from "lucide-react";

interface TrustLevelBadgeProps {
  score: number;
  level: TrustLevel;
  securityFlag: SecurityFlag;
  compact?: boolean;
  showProgress?: boolean;
  onTap?: () => void;
}

export function TrustLevelBadge({
  score,
  level,
  securityFlag,
  compact = false,
  showProgress = false,
  onTap,
}: TrustLevelBadgeProps) {
  const { t } = useI18n();
  const config = TRUST_LEVELS[level];
  const progress = getProgressToNextLevel(score);

  const flagIcon = () => {
    switch (securityFlag) {
      case "blocked":
      case "restricted": return <ShieldX className="w-4 h-4" />;
      case "high_risk":
      case "review_required":
      case "suspicious": return <ShieldAlert className="w-4 h-4" />;
      default: return level >= 3 ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />;
    }
  };

  const flagColor = () => {
    switch (securityFlag) {
      case "blocked": return "hsl(0 72% 51%)";
      case "restricted": return "hsl(0 60% 45%)";
      case "high_risk": return "hsl(25 95% 53%)";
      case "review_required": return "hsl(35 90% 50%)";
      case "suspicious": return "hsl(45 93% 47%)";
      case "low_risk": return "hsl(38 65% 56%)";
      default: return config.color;
    }
  };

  if (compact) {
    return (
      <button
        onClick={onTap}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95"
        style={{
          background: `${flagColor()}15`,
          color: flagColor(),
        }}
      >
        {flagIcon()}
        <span>{t(config.nameKey) || config.name}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
      style={{
        background: `${flagColor()}08`,
        border: `1px solid ${flagColor()}20`,
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${flagColor()}15`, color: flagColor() }}
      >
        {flagIcon()}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            {t(config.nameKey) || config.name}
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${flagColor()}15`, color: flagColor() }}
          >
            {score}/100
          </span>
        </div>

        {showProgress && progress.nextLevel !== null && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">
                {t("trust.nextLevel") || "Next level"}: {TRUST_LEVELS[progress.nextLevel].name}
              </span>
              <span className="text-[10px] font-bold" style={{ color: flagColor() }}>
                {progress.progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.progress}%`, background: flagColor() }}
              />
            </div>
          </div>
        )}

        {securityFlag !== "normal" && securityFlag !== "low_risk" && (
          <p className="text-[10px] mt-0.5" style={{ color: flagColor() }}>
            {securityFlag === "blocked" && (t("trust.blocked") || "Account suspended")}
            {securityFlag === "restricted" && (t("trust.restricted") || "Account restricted")}
            {securityFlag === "high_risk" && (t("trust.highRisk") || "Verification required")}
            {securityFlag === "review_required" && (t("trust.reviewRequired") || "Under review")}
            {securityFlag === "suspicious" && (t("trust.suspicious") || "Unusual activity detected")}
          </p>
        )}
      </div>

      {onTap && <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
    </button>
  );
}

interface TrustLimitsCardProps {
  score: number;
  level: TrustLevel;
  securityFlag?: SecurityFlag;
}

export function TrustLimitsCard({ score, level, securityFlag = "normal" }: TrustLimitsCardProps) {
  const { t } = useI18n();
  const limits = getEffectiveLimits(score, securityFlag);

  const formatLimit = (amount: number) => {
    if (amount === 0) return "—";
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return String(amount);
  };

  return (
    <div className="rounded-2xl border border-border/10 bg-card p-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        {t("trust.yourLimits") || "Your Limits"}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/20 p-3 text-center">
          <p className="text-lg font-extrabold tabular-nums text-foreground">{formatLimit(limits.dailySend)}</p>
          <p className="text-[10px] text-muted-foreground">{t("trust.dailySend") || "Daily Send"}</p>
        </div>
        <div className="rounded-xl bg-muted/20 p-3 text-center">
          <p className="text-lg font-extrabold tabular-nums text-foreground">{formatLimit(limits.dailyReceive)}</p>
          <p className="text-[10px] text-muted-foreground">{t("trust.dailyReceive") || "Daily Receive"}</p>
        </div>
        <div className="rounded-xl bg-muted/20 p-3 text-center">
          <p className="text-lg font-extrabold tabular-nums text-foreground">{formatLimit(limits.weeklySend)}</p>
          <p className="text-[10px] text-muted-foreground">{t("trust.weeklySend") || "Weekly Send"}</p>
        </div>
        <div className="rounded-xl bg-muted/20 p-3 text-center">
          <p className="text-lg font-extrabold tabular-nums text-foreground">{formatLimit(limits.singleTx)}</p>
          <p className="text-[10px] text-muted-foreground">{t("trust.perTransaction") || "Per Tx"}</p>
        </div>
        <div className="rounded-xl bg-muted/20 p-3 text-center">
          <p className="text-lg font-extrabold tabular-nums text-foreground">{formatLimit(limits.topUp)}</p>
          <p className="text-[10px] text-muted-foreground">{t("trust.topUp") || "Top-Up"}</p>
        </div>
        <div className="rounded-xl bg-muted/20 p-3 text-center">
          <p className="text-lg font-extrabold tabular-nums text-foreground">L{level}</p>
          <p className="text-[10px] text-muted-foreground">{t("trust.trustLevel") || "Trust Level"}</p>
        </div>
      </div>
    </div>
  );
}
