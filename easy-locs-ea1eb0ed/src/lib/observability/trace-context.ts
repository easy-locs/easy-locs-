/**
 * Distributed trace context (front → edge → db) with W3C Trace Context
 * (`traceparent`) propagation compatible with OpenTelemetry.
 *
 * This module:
 *   1. Generates OTel-valid 32-hex trace_id and 16-hex span_id values.
 *   2. Integrates with `@opentelemetry/api` when a TracerProvider is
 *      registered, so spans exported by this module show up in any OTLP
 *      collector attached to the global provider. If no provider is set
 *      (the common case during unit tests or stripped builds), it falls
 *      back to a no-op tracer that still emits the same trace IDs so
 *      log correlation keeps working.
 *   3. Emits the W3C `traceparent` header alongside legacy `x-trace-id`
 *      headers so Edge Functions and any downstream service (including
 *      Supabase PostgREST / pgBouncer) can correlate requests.
 *
 * Header contract:
 *   - `traceparent`: W3C — `00-<trace>-<span>-01` (sampled)
 *   - `x-trace-id`, `x-span-id`, `x-parent-span-id`, `x-request-id`:
 *     legacy headers still emitted for log-grep convenience.
 */

import { context as otelContext, trace as otelTrace, SpanKind, type Span, type Tracer } from "@opentelemetry/api";

export interface TraceContext {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  request_id: string;
  started_at: number;
}

const TRACE_HEADER = "x-trace-id";
const SPAN_HEADER = "x-span-id";
const PARENT_SPAN_HEADER = "x-parent-span-id";
const REQUEST_HEADER = "x-request-id";
const TRACEPARENT_HEADER = "traceparent";

const TRACER_NAME = "easy-locs/frontend";

function rand(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateTraceId(): string {
  return rand(16);
}

export function generateSpanId(): string {
  return rand(8);
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${rand(3)}`;
}

export function formatTraceparent(trace_id: string, span_id: string, sampled = true): string {
  return `00-${trace_id}-${span_id}-${sampled ? "01" : "00"}`;
}

export function parseTraceparent(value: string | null | undefined): { trace_id: string; span_id: string } | null {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 4) return null;
  const [version, trace_id, span_id] = parts;
  if (version !== "00" || trace_id.length !== 32 || span_id.length !== 16) return null;
  if (/[^0-9a-f]/i.test(trace_id) || /[^0-9a-f]/i.test(span_id)) return null;
  return { trace_id: trace_id.toLowerCase(), span_id: span_id.toLowerCase() };
}

let _current: TraceContext | null = null;
const _stack: TraceContext[] = [];

function getOtelTracer(): Tracer {
  return otelTrace.getTracer(TRACER_NAME);
}

export function startTrace(): TraceContext {
  const ctx: TraceContext = {
    trace_id: generateTraceId(),
    span_id: generateSpanId(),
    request_id: generateRequestId(),
    started_at: Date.now(),
  };
  _current = ctx;
  return ctx;
}

export function getCurrentTrace(): TraceContext | null {
  // Prefer an active OTel span if one has been started by the SDK.
  const active = otelTrace.getSpan(otelContext.active());
  if (active) {
    const spanCtx = active.spanContext();
    if (spanCtx && spanCtx.traceId && spanCtx.spanId) {
      return {
        trace_id: spanCtx.traceId,
        span_id: spanCtx.spanId,
        parent_span_id: _current?.span_id,
        request_id: _current?.request_id ?? generateRequestId(),
        started_at: _current?.started_at ?? Date.now(),
      };
    }
  }
  return _current;
}

export function ensureTrace(): TraceContext {
  return getCurrentTrace() ?? startTrace();
}

export function startSpan(name: string, attributes?: Record<string, string | number | boolean>): {
  context: TraceContext;
  span: Span | null;
  end: () => void;
} {
  const parent = ensureTrace();
  const tracer = getOtelTracer();
  const span = tracer.startSpan(name, { kind: SpanKind.INTERNAL, attributes });
  const spanCtx = span.spanContext();
  const ctx: TraceContext = {
    trace_id: spanCtx?.traceId && spanCtx.traceId !== "00000000000000000000000000000000"
      ? spanCtx.traceId
      : parent.trace_id,
    span_id: spanCtx?.spanId && spanCtx.spanId !== "0000000000000000"
      ? spanCtx.spanId
      : generateSpanId(),
    parent_span_id: parent.span_id,
    request_id: parent.request_id,
    started_at: Date.now(),
  };
  _stack.push(_current!);
  _current = ctx;
  return {
    context: ctx,
    span,
    end: () => {
      try { span.end(); } catch { /* noop tracer may throw */ }
      const prev = _stack.pop();
      if (prev) _current = prev;
    },
  };
}

export function endSpan(): void {
  const prev = _stack.pop();
  if (prev) _current = prev;
}

export function clearTrace(): void {
  _current = null;
  _stack.length = 0;
}

/** Inject trace headers into a Headers / plain object. */
export function injectTraceHeaders(headers: Headers | Record<string, string> = {}): Headers {
  const parent = ensureTrace();
  const childSpanId = generateSpanId();
  const h = headers instanceof Headers ? headers : new Headers(headers);
  h.set(TRACE_HEADER, parent.trace_id);
  h.set(SPAN_HEADER, childSpanId);
  h.set(PARENT_SPAN_HEADER, parent.span_id);
  h.set(REQUEST_HEADER, parent.request_id);
  h.set(TRACEPARENT_HEADER, formatTraceparent(parent.trace_id, childSpanId));
  return h;
}

/** Extract a trace context from incoming Request headers (edge side). */
export function extractTraceFromHeaders(headers: Headers): TraceContext {
  const traceparent = parseTraceparent(headers.get(TRACEPARENT_HEADER));
  const trace_id = traceparent?.trace_id || headers.get(TRACE_HEADER) || generateTraceId();
  const parent = traceparent?.span_id || headers.get(SPAN_HEADER) || undefined;
  const request_id = headers.get(REQUEST_HEADER) || generateRequestId();
  return {
    trace_id,
    span_id: generateSpanId(),
    parent_span_id: parent,
    request_id,
    started_at: Date.now(),
  };
}

/**
 * Wrap global fetch so every outbound request propagates the active trace
 * via W3C traceparent (and legacy x-trace-id headers). Idempotent.
 */
let _patched = false;
export function installFetchTracePropagation(): void {
  if (_patched || typeof fetch === "undefined") return;
  _patched = true;
  const orig = fetch.bind(globalThis);
  (globalThis as { fetch: typeof fetch }).fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    try {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      if (!/supabase\.co|replit\.dev|localhost|127\.0\.0\.1|^\//i.test(url)) {
        return orig(input, init);
      }
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      const injected = injectTraceHeaders(headers);
      return orig(input, { ...init, headers: injected });
    } catch {
      return orig(input, init);
    }
  };
}

export const TRACE_HEADERS = {
  trace: TRACE_HEADER,
  span: SPAN_HEADER,
  parentSpan: PARENT_SPAN_HEADER,
  request: REQUEST_HEADER,
  traceparent: TRACEPARENT_HEADER,
} as const;
