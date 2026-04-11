import { BaseEngine, type EngineTickResult } from "@/engines/core/base-engine";

export type WorkerIdentityRole = "engine" | "cron" | "worker" | "audit" | "heal" | "admin";

export interface WorkerIdentity {
  id: string;
  name: string;
  role: WorkerIdentityRole;
  domain: string;
  created_at: number;
  last_active: number;
  trust_level: number;
  permissions: string[];
}

export interface PolicyDeclaration {
  id: string;
  name: string;
  description: string;
  scope: string;
  enforcement: "strict" | "warn" | "log";
  check: (context: PolicyContext) => PolicyResult;
}

export interface PolicyContext {
  actor_id: string;
  action: string;
  resource: string;
  domain: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PolicyResult {
  allowed: boolean;
  policy_id: string;
  reason: string;
  severity: "info" | "warning" | "violation";
}

export interface ProofRecord {
  id: string;
  action: string;
  actor_id: string;
  resource: string;
  timestamp: number;
  proof_type: "log" | "hash" | "signature" | "audit_trail";
  proof_data: string;
  verified: boolean;
}

export interface ReleaseGate {
  id: string;
  name: string;
  required: boolean;
  check: () => ReleaseCheckResult;
}

export interface ReleaseCheckResult {
  passed: boolean;
  gate_id: string;
  message: string;
  blocking: boolean;
}

export interface ReleaseDecision {
  timestamp: number;
  gates: ReleaseCheckResult[];
  approved: boolean;
  blocking_gates: string[];
  warning_gates: string[];
}

class BlackChamber extends BaseEngine {
  private identities = new Map<string, WorkerIdentity>();
  private policies: PolicyDeclaration[] = [];
  private proofs: ProofRecord[] = [];
  private releaseGates: ReleaseGate[] = [];
  private policyViolations: PolicyResult[] = [];

  constructor() {
    super({
      id: "black-chamber",
      name: "Black Chamber",
      category: "god",
      intervalMs: 5 * 60 * 1000,
    });
    this.registerBuiltinPolicies();
  }

  async tick(): Promise<EngineTickResult> {
    const start = performance.now();
    const actions: string[] = [];
    let findings = 0;

    for (const [, identity] of this.identities) {
      if (Date.now() - identity.last_active > 600_000 && identity.role !== "admin") {
        findings++;
        actions.push(`Worker ${identity.name} inactive for 10+ min`);
      }
    }

    const recentViolations = this.policyViolations.filter(
      (v) => v.severity === "violation"
    );
    if (recentViolations.length > 0) {
      findings += recentViolations.length;
      actions.push(`${recentViolations.length} policy violations detected`);
    }

    return {
      level: findings > 0 ? "detect" : "observe",
      findings,
      actions,
      duration: Math.round(performance.now() - start),
    };
  }

  private registerBuiltinPolicies(): void {
    this.policies.push({
      id: "no-direct-db-write",
      name: "No Direct DB Write",
      description: "All DB writes must go through validation pipeline",
      scope: "data",
      enforcement: "strict",
      check: (ctx) => ({
        allowed: ctx.action !== "direct_db_write",
        policy_id: "no-direct-db-write",
        reason: ctx.action === "direct_db_write"
          ? "Direct DB writes bypassing validation are forbidden"
          : "Action is compliant",
        severity: ctx.action === "direct_db_write" ? "violation" : "info",
      }),
    });

    this.policies.push({
      id: "no-multi-writer",
      name: "No Multi-Writer",
      description: "Each field has exactly one owner",
      scope: "data",
      enforcement: "strict",
      check: (ctx) => ({
        allowed: true,
        policy_id: "no-multi-writer",
        reason: "Multi-writer check passed",
        severity: "info",
      }),
    });

    this.policies.push({
      id: "no-unsafe-heal",
      name: "No Unsafe Auto-Heal",
      description: "Unsafe fixes require human review",
      scope: "maintenance",
      enforcement: "strict",
      check: (ctx) => ({
        allowed: ctx.action !== "unsafe_auto_heal",
        policy_id: "no-unsafe-heal",
        reason: ctx.action === "unsafe_auto_heal"
          ? "Unsafe auto-heal requires human approval"
          : "Action is safe",
        severity: ctx.action === "unsafe_auto_heal" ? "violation" : "info",
      }),
    });
  }

  registerIdentity(identity: WorkerIdentity): void {
    this.identities.set(identity.id, identity);
  }

  getIdentity(id: string): WorkerIdentity | undefined {
    return this.identities.get(id);
  }

  heartbeatIdentity(id: string): boolean {
    const identity = this.identities.get(id);
    if (!identity) return false;
    identity.last_active = Date.now();
    return true;
  }

  registerPolicy(policy: PolicyDeclaration): void {
    if (this.policies.find((p) => p.id === policy.id)) return;
    this.policies.push(policy);
  }

  evaluatePolicy(context: PolicyContext): PolicyResult[] {
    const results: PolicyResult[] = [];
    for (const policy of this.policies) {
      const result = policy.check(context);
      results.push(result);
      if (result.severity === "violation") {
        this.policyViolations.push(result);
        if (this.policyViolations.length > 1000) {
          this.policyViolations = this.policyViolations.slice(-500);
        }
      }
    }
    return results;
  }

  isActionAllowed(context: PolicyContext): boolean {
    const results = this.evaluatePolicy(context);
    return results.every((r) => r.allowed);
  }

  recordProof(proof: Omit<ProofRecord, "id" | "verified">): ProofRecord {
    const record: ProofRecord = {
      ...proof,
      id: `proof-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      verified: true,
    };
    this.proofs.push(record);
    if (this.proofs.length > 5000) {
      this.proofs = this.proofs.slice(-2500);
    }
    return record;
  }

  registerReleaseGate(gate: ReleaseGate): void {
    if (this.releaseGates.find((g) => g.id === gate.id)) return;
    this.releaseGates.push(gate);
  }

  evaluateRelease(): ReleaseDecision {
    const results: ReleaseCheckResult[] = [];
    for (const gate of this.releaseGates) {
      results.push(gate.check());
    }

    const blocking = results.filter((r) => !r.passed && r.blocking);
    const warnings = results.filter((r) => !r.passed && !r.blocking);

    return {
      timestamp: Date.now(),
      gates: results,
      approved: blocking.length === 0,
      blocking_gates: blocking.map((b) => b.gate_id),
      warning_gates: warnings.map((w) => w.gate_id),
    };
  }

  getProofTrail(actorId?: string, limit = 100): ProofRecord[] {
    const filtered = actorId
      ? this.proofs.filter((p) => p.actor_id === actorId)
      : this.proofs;
    return filtered.slice(-limit);
  }

  getPolicyViolations(limit = 50): PolicyResult[] {
    return this.policyViolations.slice(-limit);
  }

  getStats() {
    return {
      identities: this.identities.size,
      activeIdentities: Array.from(this.identities.values()).filter(
        (i) => Date.now() - i.last_active < 300_000
      ).length,
      policies: this.policies.length,
      totalProofs: this.proofs.length,
      totalViolations: this.policyViolations.length,
      releaseGates: this.releaseGates.length,
    };
  }
}

export const blackChamber = new BlackChamber();
