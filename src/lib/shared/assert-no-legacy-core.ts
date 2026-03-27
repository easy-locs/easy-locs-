import { APP_GOVERNANCE } from "@/lib/shared/app-governance";

export function assertNoLegacyTableInCore(tableName: string, filePath?: string) {
  const isForbidden = APP_GOVERNANCE.forbiddenLegacyTablesInCore.some((t) =>
    tableName.includes(t)
  );

  if (!isForbidden) return;

  const isLegacyZone = APP_GOVERNANCE.isolatedLegacyZones.some((zone) =>
    (filePath || "").includes(zone)
  );

  if (isLegacyZone) return;

  throw new Error(
    `[ARCH_GUARD] Legacy table "${tableName}" forbidden in V2+ core${filePath ? ` @ ${filePath}` : ""}`
  );
}
