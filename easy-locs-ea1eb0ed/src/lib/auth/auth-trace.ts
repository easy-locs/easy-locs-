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
  | "LOGIN_FLOW_FAILED"
  | "PROVIDER_HEALTH_CHECK_COMPLETE"
  | "SOCIAL_AUTH_RUNTIME_CHECK"
  | "SOCIAL_LOGIN_STARTED"
  | "SOCIAL_LOGIN_FAILED"
  | "SOCIAL_LOGIN_REDIRECT"
  | "SOCIAL_LOGIN_NO_URL"
  | "SOCIAL_LOGIN_EXCEPTION"
  | "SOCIAL_LOGIN_PROVIDER_UNAVAILABLE"
  | "PHONE_LOGIN_STARTED"
  | "PHONE_LOGIN_FAILED"
  | "PHONE_LOGIN_NO_SESSION"
  | "PHONE_OTP_SENT"
  | "PHONE_OTP_VERIFIED"
  | "PHONE_OTP_EXPIRED"
  | "PHONE_PROVIDER_UNAVAILABLE"
  | "IDENTITY_ACTIVATION_COMPLETE"
  | "IDENTITY_ACTIVATION_STEP"
  | "IDENTITY_ACTIVATION_RETRY"
  | "OAUTH_CALLBACK_STARTED"
  | "OAUTH_CALLBACK_ERROR_PARAM"
  | "OAUTH_CALLBACK_CODE_EXCHANGE"
  | "OAUTH_CALLBACK_CODE_EXCHANGE_FAILED"
  | "OAUTH_CALLBACK_CODE_SESSION_SET"
  | "OAUTH_CALLBACK_REDIRECT"
  | "OAUTH_CALLBACK_FALLBACK_SESSION_CHECK"
  | "OAUTH_CALLBACK_SESSION_FOUND"
  | "OAUTH_CALLBACK_NO_SESSION"
  | "OAUTH_CALLBACK_EXCEPTION"
  | "DIAGNOSTIC_TEST_RUN";

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
