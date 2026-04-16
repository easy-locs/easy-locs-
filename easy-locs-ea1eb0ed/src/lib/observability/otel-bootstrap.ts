/**
 * Browser OpenTelemetry bootstrap.
 *
 * Statically depends only on `@opentelemetry/api` (which is installed and
 * used by `trace-context.ts` to pick up an active tracer). The heavier web
 * SDK + OTLP exporter packages are referenced purely via dynamic imports
 * so this module is safe to ship without them — when they aren't present
 * the bootstrap is a no-op and `trace.getTracer(...)` returns the built-in
 * NoopTracer. The custom trace-context IDs and fetch header propagation
 * still work regardless.
 *
 * Opt in by setting `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` (and optionally
 * installing `@opentelemetry/sdk-trace-web` +
 * `@opentelemetry/exporter-trace-otlp-http`).
 */

import { trace } from "@opentelemetry/api";

let _bootstrapped = false;
let _registered = false;

type AnyRecord = Record<string, unknown>;

async function dynImport(spec: string): Promise<AnyRecord | null> {
  try {
    return (await import(/* @vite-ignore */ spec)) as AnyRecord;
  } catch {
    return null;
  }
}

export async function initBrowserOtel(options: { endpoint?: string; serviceName?: string } = {}): Promise<void> {
  if (_bootstrapped) return;

  const env = typeof import.meta !== "undefined"
    ? (import.meta as { env?: Record<string, string | undefined> }).env ?? {}
    : {};
  const endpoint = options.endpoint ?? env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  _bootstrapped = true;

  const sdkWeb = await dynImport("@opentelemetry/sdk-trace-web");
  const sdkBase = await dynImport("@opentelemetry/sdk-trace-base");
  const exporter = await dynImport("@opentelemetry/exporter-trace-otlp-http");
  const resources = await dynImport("@opentelemetry/resources");
  const semconv = await dynImport("@opentelemetry/semantic-conventions");
  if (!sdkBase || !exporter) return;

  try {
    const serviceName = options.serviceName ?? "easy-locs-frontend";
    const Resource = resources?.Resource as (new (attrs: AnyRecord) => unknown) | undefined;
    const serviceNameAttr = (semconv?.SEMRESATTRS_SERVICE_NAME as string | undefined) ?? "service.name";
    const resource = Resource ? new Resource({ [serviceNameAttr]: serviceName }) : undefined;

    const BatchSpanProcessor = sdkBase.BatchSpanProcessor as new (e: unknown) => unknown;
    const OTLPTraceExporter = exporter.OTLPTraceExporter as new (o: { url: string }) => unknown;
    const otlpExporter = new OTLPTraceExporter({ url: endpoint });
    const processor = new BatchSpanProcessor(otlpExporter);

    const ProviderCtor = (sdkWeb?.WebTracerProvider ?? sdkBase.BasicTracerProvider) as
      | (new (opts?: { resource?: unknown }) => {
          addSpanProcessor(p: unknown): void;
          register?(): void;
        })
      | undefined;
    if (!ProviderCtor) return;

    const provider = new ProviderCtor({ resource });
    provider.addSpanProcessor(processor);
    try { provider.register?.(); } catch { /* noop */ }
    trace.setGlobalTracerProvider(provider as Parameters<typeof trace.setGlobalTracerProvider>[0]);
    _registered = true;
  } catch {
    // Any SDK initialisation failure falls back to the no-op tracer.
  }
}

export function isOtelBootstrapped(): boolean {
  return _bootstrapped && _registered;
}
