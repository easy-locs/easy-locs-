import { DEFAULT_V2_ENFORCEMENT_REPORT } from "@/lib/migration/v2-enforcement-report";

export function V2MigrationReportCard() {
  const report = DEFAULT_V2_ENFORCEMENT_REPORT;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold text-foreground">V2+ Enforcement Report</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Orbit Core Legacy Blocked</p>
          <p className="text-sm font-semibold text-foreground">
            {report.orbitCoreLegacyBlocked ? "YES" : "NO"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Orbit Core V2 Only</p>
          <p className="text-sm font-semibold text-foreground">
            {report.orbitCoreV2Only ? "YES" : "NO"}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Isolated Legacy Files</p>
        {report.isolatedLegacyFiles.map((item) => (
          <p key={item} className="text-xs text-muted-foreground">
            • {item}
          </p>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Pending External Migrations</p>
        {report.pendingExternalMigrations.map((item) => (
          <p key={item} className="text-xs text-muted-foreground">
            • {item}
          </p>
        ))}
      </div>
    </div>
  );
}
