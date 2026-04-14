import { platformBus } from "@/lib/shared/platform-bus";
import { recordObservabilityProof } from "@/lib/enforcement/observability";

export type FieldType = "string" | "number" | "boolean" | "object" | "array" | "null" | "any";

export interface FieldSchema {
  type: FieldType | FieldType[];
  required?: boolean;
  nullable?: boolean;
  defaultValue?: unknown;
  validator?: (value: unknown) => boolean;
}

export interface ContractSchema {
  name: string;
  fields: Record<string, FieldSchema>;
  allowExtra?: boolean;
}

export interface ContractViolation {
  contractName: string;
  boundary: "api" | "store" | "bus";
  field: string;
  expected: string;
  received: string;
  value: unknown;
  correctedValue: unknown;
  timestamp: number;
}

export interface ContractMetrics {
  totalValidations: number;
  totalViolations: number;
  contractsEnforced: number;
  violationsByBoundary: Record<string, number>;
  violationsByContract: Record<string, number>;
  recentViolations: ContractViolation[];
}

const MAX_RECENT_VIOLATIONS = 100;

class BoundaryContractValidator {
  private _contracts = new Map<string, ContractSchema>();
  private _totalValidations = 0;
  private _totalViolations = 0;
  private _violationsByBoundary: Record<string, number> = {};
  private _violationsByContract: Record<string, number> = {};
  private _recentViolations: ContractViolation[] = [];
  private _busInterceptorUnsub: (() => void) | null = null;

  registerContract(schema: ContractSchema): void {
    this._contracts.set(schema.name, schema);
  }

  getContract(name: string): ContractSchema | undefined {
    return this._contracts.get(name);
  }

  private checkFieldType(value: unknown, expectedTypes: FieldType | FieldType[]): boolean {
    const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];

    for (const t of types) {
      if (t === "any") return true;
      if (t === "null" && value === null) return true;
      if (t === "array" && Array.isArray(value)) return true;
      if (t === "object" && typeof value === "object" && value !== null && !Array.isArray(value)) return true;
      if (t === "string" && typeof value === "string") return true;
      if (t === "number" && typeof value === "number" && !isNaN(value)) return true;
      if (t === "boolean" && typeof value === "boolean") return true;
    }
    return false;
  }

  private getDefaultForType(type: FieldType | FieldType[]): unknown {
    const primary = Array.isArray(type) ? type[0] : type;
    switch (primary) {
      case "string": return "";
      case "number": return 0;
      case "boolean": return false;
      case "object": return {};
      case "array": return [];
      case "null": return null;
      default: return null;
    }
  }

  private describeType(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }

  validate(
    data: unknown,
    contractName: string,
    boundary: "api" | "store" | "bus",
  ): { valid: boolean; corrected: Record<string, unknown>; violations: ContractViolation[] } {
    this._totalValidations++;

    const contract = this._contracts.get(contractName);
    if (!contract) {
      return { valid: true, corrected: (data as Record<string, unknown>) ?? {}, violations: [] };
    }

    const violations: ContractViolation[] = [];
    const obj = (typeof data === "object" && data !== null ? { ...data as Record<string, unknown> } : {}) as Record<string, unknown>;
    const corrected = { ...obj };

    for (const [field, schema] of Object.entries(contract.fields)) {
      const value = obj[field];

      if (value === undefined || value === null) {
        if (schema.required && !schema.nullable) {
          const defaultVal = schema.defaultValue !== undefined ? schema.defaultValue : this.getDefaultForType(schema.type);
          corrected[field] = defaultVal;
          violations.push({
            contractName,
            boundary,
            field,
            expected: `required ${Array.isArray(schema.type) ? schema.type.join("|") : schema.type}`,
            received: this.describeType(value),
            value,
            correctedValue: defaultVal,
            timestamp: Date.now(),
          });
        } else if (value === null && !schema.nullable) {
          const defaultVal = schema.defaultValue !== undefined ? schema.defaultValue : this.getDefaultForType(schema.type);
          corrected[field] = defaultVal;
          violations.push({
            contractName,
            boundary,
            field,
            expected: `non-null ${Array.isArray(schema.type) ? schema.type.join("|") : schema.type}`,
            received: "null",
            value,
            correctedValue: defaultVal,
            timestamp: Date.now(),
          });
        }
        continue;
      }

      if (!this.checkFieldType(value, schema.type)) {
        const defaultVal = schema.defaultValue !== undefined ? schema.defaultValue : this.getDefaultForType(schema.type);
        corrected[field] = defaultVal;
        violations.push({
          contractName,
          boundary,
          field,
          expected: Array.isArray(schema.type) ? schema.type.join("|") : schema.type,
          received: this.describeType(value),
          value,
          correctedValue: defaultVal,
          timestamp: Date.now(),
        });
        continue;
      }

      if (schema.validator && !schema.validator(value)) {
        const defaultVal = schema.defaultValue !== undefined ? schema.defaultValue : this.getDefaultForType(schema.type);
        corrected[field] = defaultVal;
        violations.push({
          contractName,
          boundary,
          field,
          expected: `${Array.isArray(schema.type) ? schema.type.join("|") : schema.type} (custom validator)`,
          received: `invalid ${this.describeType(value)}`,
          value,
          correctedValue: defaultVal,
          timestamp: Date.now(),
        });
      }
    }

    if (violations.length > 0) {
      this._totalViolations += violations.length;
      this._violationsByBoundary[boundary] = (this._violationsByBoundary[boundary] ?? 0) + violations.length;
      this._violationsByContract[contractName] = (this._violationsByContract[contractName] ?? 0) + violations.length;

      for (const v of violations) {
        this._recentViolations.push(v);
      }
      if (this._recentViolations.length > MAX_RECENT_VIOLATIONS) {
        this._recentViolations.splice(0, this._recentViolations.length - MAX_RECENT_VIOLATIONS);
      }

      platformBus.emit("contract:violation", {
        contractName,
        boundary,
        violationCount: violations.length,
        fields: violations.map(v => v.field),
      }, "system");

      recordObservabilityProof({
        id: `proof-contract-${contractName}-${boundary}-${Date.now()}`,
        source: "boundary-contract-validator",
        category: "integrity",
        timestamp: new Date().toISOString(),
        what: `Contract violation: ${contractName} at ${boundary} boundary`,
        why: violations.map(v => `${v.field}: expected ${v.expected}, got ${v.received}`).join("; "),
        where: `${boundary}:${contractName}`,
        correction: `${violations.length} field(s) corrected to safe defaults`,
        fallbackUsed: true,
        rollbackUsed: false,
        recurrenceRisk: violations.length > 3 ? "high" : "medium",
        metadata: { violations, correctedFields: violations.map(v => v.field) },
      });
    }

    return {
      valid: violations.length === 0,
      corrected,
      violations,
    };
  }

  validateApiResponse<T extends Record<string, unknown>>(
    data: unknown,
    contractName: string,
  ): { data: T; valid: boolean; violations: ContractViolation[] } {
    const result = this.validate(data, contractName, "api");
    return { data: result.corrected as T, valid: result.valid, violations: result.violations };
  }

  validateStoreMutation<T extends Record<string, unknown>>(
    mutation: unknown,
    contractName: string,
  ): { mutation: T; valid: boolean; violations: ContractViolation[] } {
    const result = this.validate(mutation, contractName, "store");
    return { mutation: result.corrected as T, valid: result.valid, violations: result.violations };
  }

  validateBusEvent(
    payload: unknown,
    contractName: string,
  ): { payload: Record<string, unknown>; valid: boolean; violations: ContractViolation[] } {
    const result = this.validate(payload, contractName, "bus");
    return { payload: result.corrected, valid: result.valid, violations: result.violations };
  }

  installBusInterceptor(): () => void {
    if (this._busInterceptorUnsub) return this._busInterceptorUnsub;

    this._busInterceptorUnsub = platformBus.addInterceptor((type, payload, _source) => {
      const contractName = `bus:${type}`;
      if (!this._contracts.has(contractName)) return "pass";

      const result = this.validate(payload, contractName, "bus");
      if (!result.valid) {
        if (import.meta.env?.DEV) {
          console.warn(`[contract-validator] Bus event "${type}" had ${result.violations.length} violation(s), corrected`);
        }
      }
      return "pass";
    });

    return () => {
      this._busInterceptorUnsub?.();
      this._busInterceptorUnsub = null;
    };
  }

  getMetrics(): ContractMetrics {
    return {
      totalValidations: this._totalValidations,
      totalViolations: this._totalViolations,
      contractsEnforced: this._contracts.size,
      violationsByBoundary: { ...this._violationsByBoundary },
      violationsByContract: { ...this._violationsByContract },
      recentViolations: [...this._recentViolations],
    };
  }

  reset(): void {
    this._totalValidations = 0;
    this._totalViolations = 0;
    this._violationsByBoundary = {};
    this._violationsByContract = {};
    this._recentViolations = [];
    this._busInterceptorUnsub?.();
    this._busInterceptorUnsub = null;
  }
}

export const boundaryContractValidator = new BoundaryContractValidator();

boundaryContractValidator.registerContract({
  name: "api:profile",
  fields: {
    id: { type: "string", required: true },
    email: { type: "string", required: false, nullable: true },
    full_name: { type: "string", required: false, defaultValue: "" },
    role: { type: "string", required: true, defaultValue: "client" },
    avatar_url: { type: "string", required: false, nullable: true },
    created_at: { type: "string", required: false, nullable: true },
  },
});

boundaryContractValidator.registerContract({
  name: "api:booking",
  fields: {
    id: { type: "string", required: true },
    user_id: { type: "string", required: true },
    status: { type: "string", required: true, defaultValue: "pending" },
    start_time: { type: "string", required: false, nullable: true },
    end_time: { type: "string", required: false, nullable: true },
    total_amount: { type: "number", required: false, defaultValue: 0 },
    currency: { type: "string", required: false, defaultValue: "XAF" },
  },
});

boundaryContractValidator.registerContract({
  name: "api:payment",
  fields: {
    id: { type: "string", required: true },
    amount: { type: "number", required: true, defaultValue: 0, validator: (v) => (v as number) >= 0 },
    currency: { type: "string", required: true, defaultValue: "XAF" },
    status: { type: "string", required: true, defaultValue: "pending" },
    method: { type: "string", required: false, nullable: true },
    reference: { type: "string", required: false, nullable: true },
  },
});

boundaryContractValidator.registerContract({
  name: "api:message",
  fields: {
    id: { type: "string", required: true },
    conversation_id: { type: "string", required: true },
    sender_id: { type: "string", required: true },
    content: { type: "string", required: false, defaultValue: "" },
    type: { type: "string", required: true, defaultValue: "text" },
    created_at: { type: "string", required: false, nullable: true },
  },
});

boundaryContractValidator.registerContract({
  name: "api:order",
  fields: {
    id: { type: "string", required: true },
    user_id: { type: "string", required: true },
    status: { type: "string", required: true, defaultValue: "pending" },
    total: { type: "number", required: true, defaultValue: 0, validator: (v) => (v as number) >= 0 },
    items: { type: "array", required: false, defaultValue: [] },
    shop_id: { type: "string", required: false, nullable: true },
  },
});

boundaryContractValidator.registerContract({
  name: "store:wallet",
  fields: {
    balance: { type: "number", required: true, defaultValue: 0, validator: (v) => (v as number) >= 0 },
    currency: { type: "string", required: true, defaultValue: "XAF" },
    transactions: { type: "array", required: false, defaultValue: [] },
    lastSync: { type: "string", required: false, nullable: true },
  },
});

boundaryContractValidator.registerContract({
  name: "store:cart",
  fields: {
    items: { type: "array", required: true, defaultValue: [] },
    shopId: { type: "string", required: false, nullable: true },
    total: { type: "number", required: false, defaultValue: 0, validator: (v) => (v as number) >= 0 },
  },
});
