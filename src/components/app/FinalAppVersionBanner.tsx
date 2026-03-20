type FinalAppVersionBannerProps = {
  version?: string;
  buildLabel?: string;
};

export function FinalAppVersionBanner({
  version = "V1.0",
  buildLabel = "Marketplace Live Stack",
}: FinalAppVersionBannerProps) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
        Build Status
      </div>
      <div className="text-xl font-bold text-foreground mt-1">{version}</div>
      <div className="text-xs text-muted-foreground mt-1">{buildLabel}</div>
    </div>
  );
}
