/**
 * auth-trace — Structured login pipeline tracing.
 * One traceId per login attempt. All steps logged to console in dev.
 */

export type AuthTraceStep =
  | "LOGIN_SUBMIT_STARTED"
  | "LOGIN_SUPABASE_REQUEST_STARTED"
  | "LOGIN_SUPABASE_RESPONSE"
  | "LOGIN_TIMEOUT_TRIGGERED"
  | "LOGIN_SESSION_DETECTED"
  | "LOGIN_PROFILE_HYDRATE_STARTED"
  | "LOGIN_PROFILE_HYDRATE_RESULT"
  | "LOGIN_REDIRECT_STARTED"
  | "LOGIN_REDIRECT_COMPLETED"
  | "LOGIN_FLOW_FAILED";

type TracePayload = Record<string, unknown>;

interface TraceSummary {
  traceId: string;
  totalDurationMs: number;
  finalStatus: "success" | "failed";
  failedStep: string | null;
}

const PREFIX = "[AUTH]";

/** Global ref so AuthContext can read the active traceId set by Login.tsx */
let _activeTraceId: string | null = null;
let _activeTraceStart: number | null = null;

export function setActiveTrace(traceId: string, startMs: number) {
  _activeTraceId = traceId;
  _activeTraceStart = startMs;
}

export function getActiveTrace(): { traceId: string | null; startMs: number | null } {
  return { traceId: _activeTraceId, startMs: _activeTraceStart };
}

export function clearActiveTrace() {
  _activeTraceId = null;
  _activeTraceStart = null;
}

export function authLog(step: AuthTraceStep, payload: TracePayload) {
  console.log(PREFIX, { step, ...payload, at: Date.now() });
}

export function authWarn(step: AuthTraceStep, payload: TracePayload) {
  console.warn(PREFIX, { step, ...payload, at: Date.now() });
}

export function authError(step: AuthTraceStep, payload: TracePayload) {
  console.error(PREFIX, { step, ...payload, at: Date.now() });
}

export function authTraceSummary(summary: TraceSummary) {
  console.groupCollapsed(`${PREFIX} LOGIN_TRACE_SUMMARY [${summary.traceId}]`);
  console.log("traceId:", summary.traceId);
  console.log("totalDurationMs:", summary.totalDurationMs);
  console.log("finalStatus:", summary.finalStatus);
  if (summary.failedStep) {
    console.log("failedStep:", summary.failedStep);
  }
  console.groupEnd();
}
