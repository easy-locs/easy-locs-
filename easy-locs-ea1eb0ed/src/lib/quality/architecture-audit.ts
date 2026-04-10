import type { AuditResult, AuditViolation } from "./types";

const EXEMPT_PATTERNS = [
  /contexts\/Auth/,
  /stores\/v2AuthStore/,
  /lib\/i18n\.tsx/,
  /lib\/auth\//,
  /lib\/realtime/,
  /integrations\/supabase/,
  /services\/db\.ts/,
  /repositories\//,
  /domains\//,
  /lib\/monitoring/,
  /lib\/analytics/,
  /lib\/engines/,
  /lib\/wallet\//,
  /lib\/runtime/,
  /lib\/system/,
  /lib\/shared/,
  /lib\/audit/,
  /lib\/orders/,
  /lib\/merchant/,
  /lib\/mobility/,
  /lib\/radar/,
  /lib\/search/,
  /lib\/map\//,
  /lib\/commerce/,
  /lib\/import/,
  /lib\/onboarding/,
  /lib\/notification/,
  /lib\/smart/,
  /lib\/realtime/,
  /lib\/rental/,
  /lib\/reviews/,
  /lib\/security/,
  /lib\/trust/,
  /lib\/workspace/,
  /lib\/webrtc/,
  /lib\/watchdog/,
  /lib\/source/,
  /lib\/support/,
  /lib\/ride/,
  /lib\/ranking/,
  /lib\/currency/,
  /lib\/refunds/,
  /lib\/reorder/,
  /lib\/real-estate/,
  /lib\/recommendation/,
  /lib\/action-engine/,
  /lib\/ai/,
  /lib\/boost/,
  /lib\/geo/,
  /lib\/growth/,
  /lib\/platform/,
  /lib\/services/,
  /lib\/seasonal/,
  /lib\/canonical/,
  /lib\/migration/,
  /lib\/context/,
  /lib\/merchant-qr/,
  /lib\/pdf/,
  /lib\/app-security/,
  /stores\//,
  /engines\//,
  /families\//,
  /test\//,
  /\.test\./,
  /\.spec\./,
  /payments\//,
  /hooks\//,
];

const REALTIME_PATTERNS = [
  /\.channel\(/,
  /supabase\.auth/,
  /supabase\.functions/,
  /supabase\.storage/,
];

export function isExemptFile(filePath: string): boolean {
  return EXEMPT_PATTERNS.some(p => p.test(filePath));
}

export function isRealtimeOnlyUsage(supabaseUsages: string[]): boolean {
  return supabaseUsages.every(line =>
    REALTIME_PATTERNS.some(p => p.test(line))
  );
}

export interface ArchitectureViolation extends AuditViolation {
  usageType: "data_query" | "realtime" | "auth" | "storage" | "functions" | "mixed";
}

export function classifySupabaseUsage(lines: string[]): ArchitectureViolation["usageType"] {
  const hasQuery = lines.some(l => /\.from\(/.test(l) && !/\.channel\(/.test(l));
  const hasRealtime = lines.some(l => /\.channel\(/.test(l));
  const hasAuth = lines.some(l => /\.auth/.test(l));
  const hasStorage = lines.some(l => /\.storage/.test(l));
  const hasFunctions = lines.some(l => /\.functions/.test(l));

  if (hasQuery && hasRealtime) return "mixed";
  if (hasQuery) return "data_query";
  if (hasRealtime) return "realtime";
  if (hasAuth) return "auth";
  if (hasStorage) return "storage";
  if (hasFunctions) return "functions";
  return "data_query";
}

export function generateArchitectureReport(violations: ArchitectureViolation[]): AuditResult {
  const dataQueryViolations = violations.filter(v => v.usageType === "data_query" || v.usageType === "mixed");

  return {
    system: "architecture-discipline",
    status: dataQueryViolations.length === 0 ? "PASS" : dataQueryViolations.length <= 3 ? "PARTIAL" : "FAIL",
    totalViolations: violations.length,
    criticalViolations: dataQueryViolations.length,
    violations,
    summary: `${dataQueryViolations.length} data-query violations in UI layer, ${violations.length - dataQueryViolations.length} realtime-only (exempt)`,
  };
}
