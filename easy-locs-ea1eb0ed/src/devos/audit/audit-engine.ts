import type { AuditResult, Violation } from '../types';
import { architectureGuard } from '../builder/architecture-guard';
import { projectMemory } from '../memory/project-memory';

let auditCounter = 0;

function makeAuditId(): string {
  return `audit-${Date.now()}-${++auditCounter}`;
}

export function runRouteAudit(routes: { path: string; component: string; guarded: boolean }[]): AuditResult {
  const violations: Violation[] = [];

  violations.push(...architectureGuard.checkRouteConflicts(routes));

  const unguardedAdmin = routes.filter(r => r.path.startsWith('/admin') && !r.guarded);
  for (const r of unguardedAdmin) {
    violations.push({
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'missing-guard',
      severity: 'critical',
      domain: 'admin',
      location: r.path,
      message: `Admin route "${r.path}" is not protected`,
      suggestion: 'Wrap with ProtectedRoute + admin role check',
      detectedAt: new Date().toISOString(),
    });
  }

  const unguardedBuilder = routes.filter(r => r.path.startsWith('/builder') && !r.guarded);
  for (const r of unguardedBuilder) {
    violations.push({
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'missing-guard',
      severity: 'critical',
      domain: 'devos',
      location: r.path,
      message: `Builder route "${r.path}" is not protected`,
      suggestion: 'Wrap with ProtectedRoute + admin role check',
      detectedAt: new Date().toISOString(),
    });
  }

  const score = Math.max(0, 100 - violations.length * 10);
  return {
    id: makeAuditId(),
    type: 'route',
    domain: 'routing',
    violations,
    score,
    timestamp: new Date().toISOString(),
  };
}

export function runEngineAudit(engines: { name: string; hasConsumers: boolean; hasOutputs: boolean; wired: boolean }[]): AuditResult {
  const violations: Violation[] = [];

  for (const eng of engines) {
    if (!eng.hasConsumers) {
      violations.push({
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'orphan-component',
        severity: 'medium',
        domain: 'engines',
        location: eng.name,
        message: `Engine "${eng.name}" has no consumers`,
        suggestion: 'Wire to a consumer or mark as obsolete',
        detectedAt: new Date().toISOString(),
      });
    }
    if (!eng.wired) {
      violations.push({
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'shadow-system',
        severity: 'low',
        domain: 'engines',
        location: eng.name,
        message: `Engine "${eng.name}" is not wired to any system`,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  const score = Math.max(0, 100 - violations.length * 5);
  return {
    id: makeAuditId(),
    type: 'engine',
    domain: 'engines',
    violations,
    score,
    timestamp: new Date().toISOString(),
  };
}

export function runDomainHealthAudit(): AuditResult {
  const violations: Violation[] = [];
  const domains = projectMemory.getDomainMap();

  for (const domain of domains) {
    if (domain.healthScore < 70) {
      violations.push({
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'shadow-system',
        severity: 'medium',
        domain: domain.name,
        location: domain.path,
        message: `Domain "${domain.name}" health score is ${domain.healthScore}/100`,
        suggestion: 'Investigate and improve domain health',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  const avgScore = Math.round(domains.reduce((s, d) => s + d.healthScore, 0) / domains.length);
  return {
    id: makeAuditId(),
    type: 'code',
    domain: 'all',
    violations,
    score: avgScore,
    timestamp: new Date().toISOString(),
  };
}

function getKnownRoutes(): { path: string; component: string; guarded: boolean }[] {
  return [
    { path: '/', component: 'Index', guarded: false },
    { path: '/login', component: 'Login', guarded: false },
    { path: '/signup', component: 'Signup', guarded: false },
    { path: '/dashboard', component: 'Dashboard', guarded: true },
    { path: '/radar', component: 'Radar', guarded: false },
    { path: '/orbit', component: 'OrbitContacts', guarded: true },
    { path: '/wallet', component: 'WalletHub', guarded: true },
    { path: '/me', component: 'MeCommandCenter', guarded: true },
    { path: '/me/challenges', component: 'CustomerChallengesPage', guarded: true },
    { path: '/me/referral', component: 'CustomerReferralPage', guarded: true },
    { path: '/me/creator', component: 'CreatorDashboardPage', guarded: true },
    { path: '/admin', component: 'AdminDashboard', guarded: true },
    { path: '/admin/control-room', component: 'AdminControlRoomPage', guarded: true },
    { path: '/builder', component: 'DevOSDashboardPage', guarded: true },
    { path: '/builder/architecture', component: 'ArchitectureMapPage', guarded: true },
    { path: '/builder/audit', component: 'AuditCenterPage', guarded: true },
    { path: '/builder/repair', component: 'RepairCenterPage', guarded: true },
    { path: '/builder/memory', component: 'MemoryCenterPage', guarded: true },
    { path: '/builder/deploy', component: 'DeployCenterPage', guarded: true },
  ];
}

function getKnownEngines(): { name: string; hasConsumers: boolean; hasOutputs: boolean; wired: boolean }[] {
  return [
    { name: 'trust-engine', hasConsumers: true, hasOutputs: true, wired: true },
    { name: 'platform-bus', hasConsumers: true, hasOutputs: true, wired: true },
    { name: 'loyalty-engine', hasConsumers: true, hasOutputs: true, wired: true },
    { name: 'currency-engine', hasConsumers: true, hasOutputs: true, wired: true },
    { name: 'i18n-engine', hasConsumers: true, hasOutputs: true, wired: true },
    { name: 'search-engine', hasConsumers: true, hasOutputs: true, wired: true },
    { name: 'ranking-engine', hasConsumers: true, hasOutputs: true, wired: true },
    { name: 'qr-engine', hasConsumers: true, hasOutputs: true, wired: true },
    { name: 'smart-home-engine', hasConsumers: false, hasOutputs: true, wired: false },
    { name: 'action-engine', hasConsumers: false, hasOutputs: true, wired: false },
    { name: 'ui-engine', hasConsumers: false, hasOutputs: false, wired: false },
    { name: 'detection-engine', hasConsumers: false, hasOutputs: false, wired: false },
  ];
}

export function runFullAudit(): AuditResult[] {
  return [
    runDomainHealthAudit(),
    runRouteAudit(getKnownRoutes()),
    runEngineAudit(getKnownEngines()),
  ];
}

export const auditEngine = {
  runRouteAudit,
  runEngineAudit,
  runDomainHealthAudit,
  runFullAudit,
};
