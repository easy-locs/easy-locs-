export function warnLegacyIsolation(path: string, reason: string) {
  console.warn(`[LEGACY_ISOLATION] ${path} -> ${reason}`);
}
