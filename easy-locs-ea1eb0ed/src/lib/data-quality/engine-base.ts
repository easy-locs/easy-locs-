import type {
  EntityFinding,
  RemediationEntry,
  ExecutionMode,
  EngineRunLog,
  SweepCadence,
  DecisionTier,
  EntityIssue,
  IssueSeverity,
  ReasonCode,
} from "./types";

export interface EngineConfig {
  batchSize: number;
  maxFindingsPerRun: number;
  deduplicateFindings: boolean;
  rateLimit: number;
  priority: number;
}

const DEFAULT_CONFIG: EngineConfig = {
  batchSize: 50,
  maxFindingsPerRun: 500,
  deduplicateFindings: true,
  rateLimit: 100,
  priority: 5,
};

export abstract class DataQualityEngine {
  readonly name: string;
  readonly purpose: string;
  protected config: EngineConfig;
  protected runLogs: EngineRunLog[] = [];
  protected findings: EntityFinding[] = [];
  protected remediations: RemediationEntry[] = [];
  private findingKeys = new Set<string>();
  private lastRunAt: string | null = null;
  private running = false;

  constructor(name: string, purpose: string, config?: Partial<EngineConfig>) {
    this.name = name;
    this.purpose = purpose;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  abstract scan(mode: ExecutionMode): EntityFinding[];
  abstract classify(findings: EntityFinding[]): EntityFinding[];

  remediate(findings: EntityFinding[], mode: ExecutionMode): RemediationEntry[] {
    if (mode === "DRY_RUN") return [];
    return [];
  }

  run(mode: ExecutionMode, cadence: SweepCadence = "manual"): EngineRunLog {
    if (this.running) {
      return this.createRunLog(mode, cadence, "failed", "Engine already running");
    }

    this.running = true;
    const startedAt = new Date().toISOString();
    this.findings = [];
    this.remediations = [];

    try {
      const rawFindings = this.scan(mode);
      const classified = this.classify(rawFindings);
      const deduped = this.config.deduplicateFindings
        ? this.deduplicateFindings(classified)
        : classified;

      const limited = deduped.slice(0, this.config.maxFindingsPerRun);
      this.findings = limited;

      if (mode !== "DRY_RUN") {
        this.remediations = this.remediate(limited, mode);
      }

      this.lastRunAt = new Date().toISOString();

      const log = this.createRunLog(mode, cadence, "success", undefined, {
        startedAt,
        entitiesScanned: limited.length,
        issuesFound: limited.filter((f) => f.issues.length > 0).length,
        autoFixed: this.remediations.filter((r) => r.action === "auto_fixed").length,
        quarantined: this.remediations.filter((r) => r.action === "quarantined").length,
        suppressed: this.remediations.filter((r) => r.action === "suppressed").length,
        reviewNeeded: this.remediations.filter((r) => r.action === "review_needed").length,
      });

      this.runLogs.push(log);
      if (this.runLogs.length > 50) this.runLogs.shift();

      return log;
    } catch (err) {
      const log = this.createRunLog(mode, cadence, "failed", String(err), { startedAt });
      this.runLogs.push(log);
      return log;
    } finally {
      this.running = false;
    }
  }

  getFindings(): readonly EntityFinding[] {
    return this.findings;
  }

  getRemediations(): readonly RemediationEntry[] {
    return this.remediations;
  }

  getRunLogs(): readonly EngineRunLog[] {
    return this.runLogs;
  }

  getLastRunAt(): string | null {
    return this.lastRunAt;
  }

  isRunning(): boolean {
    return this.running;
  }

  protected makeIssue(
    category: EntityIssue["category"],
    severity: IssueSeverity,
    code: string,
    message: string,
    decisionTier: DecisionTier,
    field?: string,
    expected?: string,
    actual?: string,
    reasonCode?: ReasonCode
  ): EntityIssue {
    return { category, severity, code, message, field, expected, actual, reasonCode, decisionTier };
  }

  private deduplicateFindings(findings: EntityFinding[]): EntityFinding[] {
    const result: EntityFinding[] = [];
    for (const f of findings) {
      const key = `${f.entityId}::${f.source}::${f.issues.map((i) => i.code).sort().join(",")}`;
      if (!this.findingKeys.has(key)) {
        this.findingKeys.add(key);
        result.push(f);
      }
    }
    return result;
  }

  private createRunLog(
    mode: ExecutionMode,
    cadence: SweepCadence,
    status: "success" | "partial" | "failed",
    message?: string,
    counts?: {
      startedAt?: string;
      entitiesScanned?: number;
      issuesFound?: number;
      autoFixed?: number;
      quarantined?: number;
      suppressed?: number;
      reviewNeeded?: number;
    }
  ): EngineRunLog {
    return {
      engineName: this.name,
      startedAt: counts?.startedAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      mode,
      cadence,
      entitiesScanned: counts?.entitiesScanned ?? 0,
      issuesFound: counts?.issuesFound ?? 0,
      autoFixed: counts?.autoFixed ?? 0,
      quarantined: counts?.quarantined ?? 0,
      suppressed: counts?.suppressed ?? 0,
      reviewNeeded: counts?.reviewNeeded ?? 0,
      errors: status === "failed" ? 1 : 0,
      status,
      batchSize: this.config.batchSize,
      message,
    };
  }

  resetFindingDedup(): void {
    this.findingKeys.clear();
  }
}
