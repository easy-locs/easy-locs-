/**
 * ATOM: createCorrelationId — Pure UUID generator for flow tracing.
 * No side effects, no imports, no store access.
 */
export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function createRequestId(): string {
  return `req_${crypto.randomUUID().slice(0, 12)}`;
}
