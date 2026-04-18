import type { AuditFinding } from '../types';
import { emit } from '../monitoring';

let findingCounter = 0;

function makeFindingId(): string {
  findingCounter += 1;
  return `find-${Date.now().toString(36)}-${findingCounter.toString(36)}`;
}

export interface AuditScanInput {
  domain: string;
  severity: AuditFinding['severity'];
  message: string;
  location: string;
}

/**
 * AuditAgent — read-only. Emits findings; never proposes tasks, never
 * spawns other agents, never executes.
 */
export const auditAgent = {
  scan(input: AuditScanInput[]): AuditFinding[] {
    const findings: AuditFinding[] = input.map(i => ({
      id: makeFindingId(),
      stage: 'audit',
      domain: i.domain,
      severity: i.severity,
      message: i.message,
      location: i.location,
      detectedAt: new Date().toISOString(),
    }));
    for (const f of findings) {
      emit({
        stage: 'audit',
        kind: 'finding-emitted',
        findingId: f.id,
        message: `Audit finding: ${f.message}`,
        details: { domain: f.domain, severity: f.severity, location: f.location },
      });
    }
    return findings;
  },
};
