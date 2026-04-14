import { auditEngine } from '../audit/audit-engine';
import { proofRegistry } from '../observability/proof-registry';
import { projectMemory } from '../memory/project-memory';
import { devosPersistence } from './devos-persistence';
import type { AuditResult } from '../types';

const AUDIT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ERROR_WATCH_INTERVAL_MS = 10_000; // 10 seconds

let auditTimer: ReturnType<typeof setInterval> | null = null;
let healthTimer: ReturnType<typeof setInterval> | null = null;
let errorWatchTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let errorBuffer: { message: string; timestamp: string }[] = [];

function log(level: 'info' | 'warn' | 'error', source: string, message: string) {
  devosPersistence.appendRuntimeLog({ level, source, message });
  if (level === 'error') {
    console.error(`[DevOS:${source}] ${message}`);
  }
}

function runPeriodicAudit(): void {
  try {
    const results = auditEngine.runFullAudit();
    const totalViolations = results.reduce((s, r) => s + r.violations.length, 0);

    for (const audit of results) {
      devosPersistence.persistAuditResult(audit);
    }

    const proof = proofRegistry.logProof({
      type: 'audit',
      summary: `Periodic audit: ${results.length} checks, ${totalViolations} violations`,
      details: {
        auditCount: results.length,
        totalViolations,
        scores: results.map(r => ({ type: r.type, domain: r.domain, score: r.score })),
      },
      actor: 'devos-runtime',
    });
    devosPersistence.persistProof(proof);
    devosPersistence.setLastScanTime(new Date().toISOString());

    log('info', 'audit', `Periodic audit complete: ${totalViolations} violations found`);

    if (totalViolations > 0) {
      for (const audit of results) {
        for (const v of audit.violations) {
          if (v.severity === 'critical' || v.severity === 'high') {
            const incident = proofRegistry.logIncident({
              severity: v.severity,
              domain: v.domain,
              description: `[Auto-detected] ${v.message}`,
            });
            devosPersistence.persistIncident(incident);
          }
        }
      }
    }
  } catch (err) {
    log('error', 'audit', `Periodic audit failed: ${err}`);
  }
}

function runHealthCheck(): void {
  try {
    const dashboard = proofRegistry.getHealthDashboard();
    const engineHealth = proofRegistry.getEngineHealthSummary();

    if (dashboard.overall.score < 70) {
      const incident = proofRegistry.logIncident({
        severity: 'high',
        domain: 'system',
        description: `Overall health dropped to ${dashboard.overall.score}/100`,
      });
      devosPersistence.persistIncident(incident);
      log('warn', 'health', `Health warning: score ${dashboard.overall.score}/100`);
    }

    const criticalEngines = engineHealth.engines.filter(e => e.health < 30);
    for (const eng of criticalEngines) {
      log('warn', 'health', `Engine "${eng.name}" health critical: ${eng.health}%`);
    }

    log('info', 'health', `Health check: ${dashboard.overall.score}/100, ${engineHealth.wired}/${engineHealth.totalEngines} engines wired`);
  } catch (err) {
    log('error', 'health', `Health check failed: ${err}`);
  }
}

function installErrorWatcher(): void {
  const originalOnError = window.onerror;
  window.onerror = (message, source, line, col, error) => {
    const msg = typeof message === 'string' ? message : 'Unknown error';
    errorBuffer.push({ message: msg, timestamp: new Date().toISOString() });

    if (errorBuffer.length > 100) {
      errorBuffer = errorBuffer.slice(-50);
    }

    log('error', 'runtime', `Uncaught: ${msg} at ${source}:${line}:${col}`);

    if (originalOnError) {
      return (originalOnError as Function)(message, source, line, col, error);
    }
    return false;
  };

  const originalUnhandled = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    const msg = event.reason?.message || String(event.reason) || 'Unhandled promise rejection';
    errorBuffer.push({ message: msg, timestamp: new Date().toISOString() });
    log('error', 'runtime', `Unhandled rejection: ${msg}`);

    if (originalUnhandled) {
      (originalUnhandled as Function)(event);
    }
  };
}

function processErrorBuffer(): void {
  if (errorBuffer.length === 0) return;

  const recentErrors = errorBuffer.filter(e => {
    const age = Date.now() - new Date(e.timestamp).getTime();
    return age < ERROR_WATCH_INTERVAL_MS;
  });

  if (recentErrors.length >= 5) {
    const incident = proofRegistry.logIncident({
      severity: 'high',
      domain: 'runtime',
      description: `Error storm detected: ${recentErrors.length} errors in last ${ERROR_WATCH_INTERVAL_MS / 1000}s`,
    });
    devosPersistence.persistIncident(incident);
    log('warn', 'watchdog', `Error storm: ${recentErrors.length} errors`);
  }
}

export function startDevOSRuntime(): void {
  if (isRunning) return;
  isRunning = true;

  log('info', 'boot', 'DevOS Runtime starting...');

  installErrorWatcher();

  setTimeout(() => {
    runPeriodicAudit();
    runHealthCheck();
    log('info', 'boot', 'DevOS Runtime initial scan complete');
  }, 3000);

  auditTimer = setInterval(runPeriodicAudit, AUDIT_INTERVAL_MS);
  healthTimer = setInterval(runHealthCheck, HEALTH_CHECK_INTERVAL_MS);
  errorWatchTimer = setInterval(processErrorBuffer, ERROR_WATCH_INTERVAL_MS);

  log('info', 'boot', `DevOS Runtime active — audit every ${AUDIT_INTERVAL_MS / 60000}min, health every ${HEALTH_CHECK_INTERVAL_MS / 60000}min`);

  const proof = proofRegistry.logProof({
    type: 'engine-health',
    summary: 'DevOS Runtime started successfully',
    details: {
      auditIntervalMs: AUDIT_INTERVAL_MS,
      healthCheckIntervalMs: HEALTH_CHECK_INTERVAL_MS,
      errorWatchIntervalMs: ERROR_WATCH_INTERVAL_MS,
    },
    actor: 'devos-runtime',
  });
  devosPersistence.persistProof(proof);
}

export function stopDevOSRuntime(): void {
  if (!isRunning) return;

  if (auditTimer) clearInterval(auditTimer);
  if (healthTimer) clearInterval(healthTimer);
  if (errorWatchTimer) clearInterval(errorWatchTimer);
  auditTimer = null;
  healthTimer = null;
  errorWatchTimer = null;
  isRunning = false;

  log('info', 'shutdown', 'DevOS Runtime stopped');
}

export function getDevOSStatus() {
  const lastScan = devosPersistence.getLastScanTime();
  const recentLogs = devosPersistence.getRuntimeLog().slice(-20);
  const persistedAudits = devosPersistence.getPersistedAudits();
  const persistedIncidents = devosPersistence.getPersistedIncidents();
  const persistedProofs = devosPersistence.getPersistedProofs();

  return {
    isRunning,
    lastScan,
    totalAuditsRun: persistedAudits.length,
    totalIncidents: persistedIncidents.length,
    totalProofs: persistedProofs.length,
    recentLogs,
    errorBufferSize: errorBuffer.length,
    uptime: isRunning ? 'active' : 'stopped',
  };
}

export const devosRuntime = {
  start: startDevOSRuntime,
  stop: stopDevOSRuntime,
  getStatus: getDevOSStatus,
};
