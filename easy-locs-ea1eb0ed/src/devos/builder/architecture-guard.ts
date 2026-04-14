import type { Violation, Severity, ViolationType } from '../types';

const PRODUCT_DOMAINS = [
  'dashboard', 'radar', 'orbit', 'wallet', 'marketplace',
  'me', 'onboarding', 'property', 'travel', 'support',
  'admin', 'loyalty', 'creator', 'flight', 'ride', 'rental',
  'delivery', 'real-estate', 'content-pipeline', 'seo',
] as const;

const SENSITIVE_ZONES = [
  'src/domains/orbit',
  'src/domains/wallet',
  'src/lib/platform-bus',
  'src/lib/trust-engine',
  'src/lib/core',
  'src/app/providers',
  'src/lib/shared',
];

const FORBIDDEN_PATTERNS = [
  { pattern: /supabase\.(from|rpc)\(/, context: 'ui', message: 'Direct DB access from UI layer — use a service' },
  { pattern: /createClient\(/, context: 'pages', message: 'Supabase client creation in page — use shared client' },
  { pattern: /new EventTarget\(\)/, context: 'domains', message: 'Custom event bus in domain — use platform-bus' },
];

let violationCounter = 0;
function makeId(): string {
  return `v-${Date.now()}-${++violationCounter}`;
}

function createViolation(
  type: ViolationType,
  severity: Severity,
  domain: string,
  location: string,
  message: string,
  suggestion?: string,
): Violation {
  return {
    id: makeId(),
    type,
    severity,
    domain,
    location,
    message,
    suggestion,
    detectedAt: new Date().toISOString(),
  };
}

export function checkRouteConflicts(routes: { path: string; component: string }[]): Violation[] {
  const violations: Violation[] = [];
  const seen = new Map<string, string>();
  for (const route of routes) {
    if (seen.has(route.path)) {
      violations.push(createViolation(
        'route-conflict',
        'high',
        'routing',
        route.path,
        `Duplicate route "${route.path}" → ${route.component} conflicts with ${seen.get(route.path)}`,
        'Remove or rename one of the conflicting routes',
      ));
    }
    seen.set(route.path, route.component);
  }
  return violations;
}

export function checkDomainBoundaries(imports: { source: string; target: string }[]): Violation[] {
  const violations: Violation[] = [];
  for (const imp of imports) {
    const sourceDomain = PRODUCT_DOMAINS.find(d => imp.source.includes(`/domains/${d}/`));
    const targetDomain = PRODUCT_DOMAINS.find(d => imp.target.includes(`/domains/${d}/`));
    if (sourceDomain && targetDomain && sourceDomain !== targetDomain) {
      violations.push(createViolation(
        'cross-domain-write',
        'medium',
        sourceDomain,
        imp.source,
        `Cross-domain import: ${sourceDomain} → ${targetDomain}`,
        'Use platform-bus events or shared services instead of direct imports',
      ));
    }
  }
  return violations;
}

export function isSensitiveZone(filePath: string): boolean {
  return SENSITIVE_ZONES.some(zone => filePath.includes(zone));
}

export function checkForbiddenPatterns(code: string, filePath: string): Violation[] {
  const violations: Violation[] = [];
  for (const fp of FORBIDDEN_PATTERNS) {
    if (filePath.includes(fp.context) && fp.pattern.test(code)) {
      violations.push(createViolation(
        'forbidden-import',
        'high',
        fp.context,
        filePath,
        fp.message,
      ));
    }
  }
  return violations;
}

export function validatePatchTarget(filePath: string): { allowed: boolean; requiresReview: boolean; reason?: string } {
  if (filePath.includes('/devos/')) {
    return { allowed: true, requiresReview: false };
  }
  if (isSensitiveZone(filePath)) {
    return { allowed: true, requiresReview: true, reason: `Sensitive zone: ${filePath}` };
  }
  return { allowed: true, requiresReview: false };
}

export function getDomainOwner(filePath: string): string | null {
  for (const domain of PRODUCT_DOMAINS) {
    if (filePath.includes(`/domains/${domain}/`) || filePath.includes(`/pages/${domain}/`)) {
      return domain;
    }
  }
  return null;
}

export const architectureGuard = {
  checkRouteConflicts,
  checkDomainBoundaries,
  checkForbiddenPatterns,
  validatePatchTarget,
  getDomainOwner,
  isSensitiveZone,
  PRODUCT_DOMAINS,
  SENSITIVE_ZONES,
};
