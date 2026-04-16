import type { QuarantineEntry, EntityClassification } from "./types";

const quarantineStore: QuarantineEntry[] = [];
const quarantinedIds = new Set<string>();

export function quarantineEntity(entry: QuarantineEntry): void {
  const key = `${entry.source}::${entry.entityId}`;
  if (quarantinedIds.has(key)) return;
  quarantinedIds.add(key);
  quarantineStore.push(entry);
}

export function isQuarantined(entityId: string, source?: string): boolean {
  if (source) return quarantinedIds.has(`${source}::${entityId}`);
  for (const id of quarantinedIds) {
    if (id.endsWith(`::${entityId}`)) return true;
  }
  return false;
}

export function getQuarantineList(): readonly QuarantineEntry[] {
  return quarantineStore;
}

export function getQuarantineCount(): number {
  return quarantineStore.length;
}

export function getQuarantinedByVertical(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const entry of quarantineStore) {
    map[entry.vertical] = (map[entry.vertical] ?? 0) + 1;
  }
  return map;
}

export function getQuarantinedByClassification(): Record<EntityClassification, number> {
  const map = {} as Record<EntityClassification, number>;
  for (const entry of quarantineStore) {
    map[entry.classification] = (map[entry.classification] ?? 0) + 1;
  }
  return map;
}

export function getQuarantinedBySource(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const entry of quarantineStore) {
    map[entry.source] = (map[entry.source] ?? 0) + 1;
  }
  return map;
}

export function getQuarantinedByReason(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const entry of quarantineStore) {
    for (const code of entry.reasonCodes) {
      map[code] = (map[code] ?? 0) + 1;
    }
  }
  return map;
}

export function getQuarantineEntry(entityId: string, source?: string): QuarantineEntry | undefined {
  if (source) {
    return quarantineStore.find((e) => e.entityId === entityId && e.source === source);
  }
  return quarantineStore.find((e) => e.entityId === entityId);
}

export function restoreFromQuarantine(entityId: string, source: string): boolean {
  const key = `${source}::${entityId}`;
  if (!quarantinedIds.has(key)) return false;

  quarantinedIds.delete(key);
  const idx = quarantineStore.findIndex((e) => e.entityId === entityId && e.source === source);
  if (idx >= 0) {
    quarantineStore.splice(idx, 1);
  }
  return true;
}

export function clearQuarantine(): void {
  quarantineStore.length = 0;
  quarantinedIds.clear();
}

export async function syncToServiceQuarantine(
  entityId: string,
  source: string,
  severity: "low" | "medium" | "high" | "critical",
  reason: string,
): Promise<void> {
  if (severity !== "high" && severity !== "critical") return;

  try {
    const { quarantineEntity: systemQuarantine } = await import("@/services/quarantine/quarantine-system");
    systemQuarantine({
      entityId,
      entityType: "data_record",
      reason: severity === "critical" ? "DATA_INTEGRITY_FAILURE" : "LOW_CONFIDENCE",
      details: reason,
      source,
      metadata: { originalSeverity: severity, quarantinedAt: new Date().toISOString() },
    });
  } catch (e) {
    if (import.meta.env?.DEV) {
      console.warn("[quarantine-bridge] Failed to sync to services/quarantine:", e);
    }
  }
}

export function quarantineEntityWithSync(entry: QuarantineEntry): void {
  quarantineEntity(entry);

  const severity = entry.classification === "junk" || entry.classification === "dangerous"
    ? "critical"
    : entry.classification === "duplicate" || entry.classification === "incomplete"
      ? "high"
      : "medium";

  syncToServiceQuarantine(
    entry.entityId,
    entry.source,
    severity,
    entry.reasonCodes.join(", "),
  );
}
