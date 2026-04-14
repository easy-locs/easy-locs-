import { platformBus } from "@/lib/shared/platform-bus";

export interface BoundaryValidationResult {
  valid: boolean;
  errors: string[];
  boundary: string;
  schemaVersion?: string;
  correlationId?: string;
  quarantined: boolean;
}

export interface BoundarySchema {
  name: string;
  version: string;
  validate: (payload: unknown) => { valid: boolean; errors: string[] };
}

const registeredSchemas = new Map<string, BoundarySchema>();
const quarantineLog: Array<{
  boundary: string;
  errors: string[];
  payloadSummary: string;
  correlationId?: string;
  timestamp: number;
}> = [];
const MAX_QUARANTINE_LOG = 200;

const validationCounters: Record<string, { passed: number; failed: number; quarantined: number }> = {};

function getCounter(boundary: string) {
  if (!validationCounters[boundary]) {
    validationCounters[boundary] = { passed: 0, failed: 0, quarantined: 0 };
  }
  return validationCounters[boundary];
}

export function registerBoundarySchema(schema: BoundarySchema): void {
  registeredSchemas.set(schema.name, schema);
}

let strictMode = true;

export function setBoundaryStrictMode(strict: boolean): void {
  strictMode = strict;
}

export function validateAtBoundary(
  boundaryName: string,
  payload: unknown,
  opts?: { correlationId?: string; schemaVersion?: string; quarantineOnFail?: boolean },
): BoundaryValidationResult {
  const counter = getCounter(boundaryName);
  const schema = registeredSchemas.get(boundaryName);

  if (!schema) {
    if (strictMode) {
      counter.failed++;
      const errors = [`No schema registered for boundary "${boundaryName}" — strict mode rejects unregistered boundaries`];

      platformBus.emit("boundary:unregistered_boundary", {
        boundary: boundaryName,
        correlationId: opts?.correlationId,
      }, "system");

      return {
        valid: false,
        errors,
        boundary: boundaryName,
        correlationId: opts?.correlationId,
        quarantined: false,
      };
    }

    const basicResult = validateBasicShape(payload);
    if (!basicResult.valid) {
      counter.failed++;
      return {
        valid: false,
        errors: basicResult.errors,
        boundary: boundaryName,
        correlationId: opts?.correlationId,
        quarantined: false,
      };
    }
    counter.passed++;
    return {
      valid: true,
      errors: [],
      boundary: boundaryName,
      correlationId: opts?.correlationId,
      quarantined: false,
    };
  }

  if (opts?.schemaVersion && opts.schemaVersion !== schema.version) {
    counter.failed++;
    const errors = [`Schema version mismatch: expected ${schema.version}, got ${opts.schemaVersion}`];
    if (opts?.quarantineOnFail !== false) {
      quarantinePayload(boundaryName, payload, errors, opts?.correlationId);
    }
    return {
      valid: false,
      errors,
      boundary: boundaryName,
      schemaVersion: schema.version,
      correlationId: opts?.correlationId,
      quarantined: opts?.quarantineOnFail !== false,
    };
  }

  const result = schema.validate(payload);

  if (!result.valid) {
    counter.failed++;
    const shouldQuarantine = opts?.quarantineOnFail !== false;
    if (shouldQuarantine) {
      quarantinePayload(boundaryName, payload, result.errors, opts?.correlationId);
      counter.quarantined++;
    }

    platformBus.emit("boundary:validation_failed", {
      boundary: boundaryName,
      errors: result.errors,
      correlationId: opts?.correlationId,
      quarantined: shouldQuarantine,
    }, "system");

    return {
      valid: false,
      errors: result.errors,
      boundary: boundaryName,
      schemaVersion: schema.version,
      correlationId: opts?.correlationId,
      quarantined: shouldQuarantine,
    };
  }

  counter.passed++;
  return {
    valid: true,
    errors: [],
    boundary: boundaryName,
    schemaVersion: schema.version,
    correlationId: opts?.correlationId,
    quarantined: false,
  };
}

function validateBasicShape(payload: unknown): { valid: boolean; errors: string[] } {
  if (payload === null || payload === undefined) {
    return { valid: false, errors: ["Payload is null or undefined"] };
  }
  if (typeof payload !== "object") {
    return { valid: false, errors: [`Expected object, got ${typeof payload}`] };
  }
  return { valid: true, errors: [] };
}

function quarantinePayload(
  boundary: string,
  payload: unknown,
  errors: string[],
  correlationId?: string,
): void {
  const summary = typeof payload === "object" && payload !== null
    ? JSON.stringify(payload).slice(0, 500)
    : String(payload);

  quarantineLog.push({
    boundary,
    errors,
    payloadSummary: summary,
    correlationId,
    timestamp: Date.now(),
  });

  if (quarantineLog.length > MAX_QUARANTINE_LOG) {
    quarantineLog.splice(0, quarantineLog.length - MAX_QUARANTINE_LOG);
  }
}

export function createApiResponseValidator(endpointName: string): BoundarySchema {
  return {
    name: `api_response:${endpointName}`,
    version: "1.0",
    validate: (payload) => {
      const errors: string[] = [];
      if (payload === null || payload === undefined) {
        errors.push("API response is null/undefined");
      }
      if (typeof payload === "object" && payload !== null) {
        const p = payload as Record<string, unknown>;
        if (p.error && typeof p.error === "object") {
          const err = p.error as Record<string, unknown>;
          if (err.message) errors.push(`API error: ${err.message}`);
        }
      }
      return { valid: errors.length === 0, errors };
    },
  };
}

export function createWebhookValidator(webhookType: string, requiredFields: string[]): BoundarySchema {
  return {
    name: `webhook:${webhookType}`,
    version: "1.0",
    validate: (payload) => {
      const errors: string[] = [];
      if (typeof payload !== "object" || payload === null) {
        errors.push("Webhook payload must be an object");
        return { valid: false, errors };
      }
      const p = payload as Record<string, unknown>;
      for (const field of requiredFields) {
        if (p[field] === undefined || p[field] === null) {
          errors.push(`Missing required field: ${field}`);
        }
      }
      return { valid: errors.length === 0, errors };
    },
  };
}

export function createQueueConsumerValidator(queueName: string, requiredFields: string[]): BoundarySchema {
  return {
    name: `queue_consumer:${queueName}`,
    version: "1.0",
    validate: (payload) => {
      const errors: string[] = [];
      if (typeof payload !== "object" || payload === null) {
        errors.push("Queue payload must be an object");
        return { valid: false, errors };
      }
      const p = payload as Record<string, unknown>;
      for (const field of requiredFields) {
        if (p[field] === undefined || p[field] === null) {
          errors.push(`Missing required queue field: ${field}`);
        }
      }
      return { valid: errors.length === 0, errors };
    },
  };
}

export function createEventBusValidator(eventPattern: string): BoundarySchema {
  return {
    name: `event_bus:${eventPattern}`,
    version: "1.0",
    validate: (payload) => {
      const errors: string[] = [];
      if (typeof payload !== "object" || payload === null) {
        errors.push("Event payload must be an object");
        return { valid: false, errors };
      }
      return { valid: true, errors };
    },
  };
}

export function createCacheRestoreValidator(cacheKey: string, expectedFields: string[]): BoundarySchema {
  return {
    name: `cache_restore:${cacheKey}`,
    version: "1.0",
    validate: (payload) => {
      const errors: string[] = [];
      if (typeof payload !== "object" || payload === null) {
        errors.push("Cached data must be an object");
        return { valid: false, errors };
      }
      const p = payload as Record<string, unknown>;
      for (const field of expectedFields) {
        if (p[field] === undefined) {
          errors.push(`Cache data missing expected field: ${field}`);
        }
      }
      return { valid: errors.length === 0, errors };
    },
  };
}

export function createStoreMutationValidator(storeName: string, stateShape: Record<string, string>): BoundarySchema {
  return {
    name: `store_mutation:${storeName}`,
    version: "1.0",
    validate: (payload) => {
      const errors: string[] = [];
      if (typeof payload !== "object" || payload === null) {
        errors.push("Store mutation must be an object");
        return { valid: false, errors };
      }
      const p = payload as Record<string, unknown>;
      for (const [field, expectedType] of Object.entries(stateShape)) {
        if (p[field] !== undefined && typeof p[field] !== expectedType) {
          errors.push(`Store field "${field}": expected ${expectedType}, got ${typeof p[field]}`);
        }
      }
      return { valid: errors.length === 0, errors };
    },
  };
}

export function getQuarantineLog() {
  return [...quarantineLog];
}

export function getValidationCounters(): Record<string, { passed: number; failed: number; quarantined: number }> {
  return { ...validationCounters };
}

export function clearQuarantineLog(): void {
  quarantineLog.length = 0;
}

export function getRegisteredSchemas(): string[] {
  return Array.from(registeredSchemas.keys());
}

const DEFAULT_WEBHOOK_VALIDATORS: Array<{ type: string; fields: string[] }> = [
  { type: "stripe", fields: ["id", "type", "data"] },
  { type: "supabase_auth", fields: ["type", "table", "record"] },
  { type: "booking_update", fields: ["booking_id", "status", "timestamp"] },
  { type: "payment_confirmation", fields: ["payment_id", "amount", "currency", "status"] },
  { type: "delivery_status", fields: ["order_id", "status", "timestamp"] },
];

const DEFAULT_QUEUE_VALIDATORS: Array<{ queue: string; fields: string[] }> = [
  { queue: "email", fields: ["to", "subject"] },
  { queue: "push", fields: ["user_id", "title", "body"] },
  { queue: "booking", fields: ["booking_id", "action"] },
  { queue: "payment-webhook", fields: ["event_type"] },
  { queue: "notification", fields: ["recipient_id", "type"] },
  { queue: "delivery", fields: ["order_id", "action"] },
];

export function registerDefaultBoundaryValidators(): void {
  for (const wh of DEFAULT_WEBHOOK_VALIDATORS) {
    registerBoundarySchema(createWebhookValidator(wh.type, wh.fields));
  }
  for (const q of DEFAULT_QUEUE_VALIDATORS) {
    registerBoundarySchema(createQueueConsumerValidator(q.queue, q.fields));
  }

  registerBoundarySchema(createEventBusValidator("system.*"));
  registerBoundarySchema(createEventBusValidator("orbit.*"));
  registerBoundarySchema(createEventBusValidator("wallet.*"));
  registerBoundarySchema(createEventBusValidator("booking.*"));

  registerBoundarySchema(createApiResponseValidator("supabase_query"));
  registerBoundarySchema(createApiResponseValidator("supabase_mutation"));

  registerBoundarySchema(createCacheRestoreValidator("user_session", ["user_id", "email"]));
  registerBoundarySchema(createCacheRestoreValidator("dashboard_state", ["cards", "lastUpdated"]));

  registerBoundarySchema(createStoreMutationValidator("auth", { user: "object", session: "object" }));
  registerBoundarySchema(createStoreMutationValidator("wallet", { balance: "number", currency: "string" }));
}
