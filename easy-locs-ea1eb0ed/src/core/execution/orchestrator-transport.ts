/**
 * HTTP transport for the OrchestratorAdapter.
 *
 * Posts an execution task to the existing orchestrator service (the same
 * service that handles the GitHub webhook flow), reusing its admin-token
 * auth scheme. The orchestrator's webhook flow is untouched — this is a
 * separate ingest endpoint added by task #711's server-side loop.
 *
 * If no endpoint or admin token is configured, `HttpOrchestratorTransport`
 * is intentionally omitted from `getDefaultTransport()` and the safer
 * `PendingHandoffTransport` is used instead — keeping the task in PENDING
 * for the server-side loop to consume.
 */

import type {
  ExecutionTaskRow,
} from "./types";
import type {
  OrchestratorResponse,
  OrchestratorTransport,
} from "./orchestrator-adapter";

// IMPORTANT: only NON-`VITE_` env names are read here. Anything prefixed with
// `VITE_` is bundled into the browser by Vite, which would leak the
// orchestrator admin token to every client. The HTTP transport is a
// server-side concern (edge function / Node loop in task #711); the browser
// build always falls through to `PendingHandoffTransport`.
const ORCHESTRATOR_URL_ENV_KEY = "ORCHESTRATOR_URL" as const;
const ORCHESTRATOR_TOKEN_ENV_KEY = "ORCHESTRATOR_ADMIN_TOKEN" as const;

function readServerEnv(key: string): string | undefined {
  // Hard browser guard: never look at any env in the browser bundle.
  if (typeof window !== "undefined") return undefined;
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[key];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Real transport — POSTs the task to the configured orchestrator endpoint.
 */
export class HttpOrchestratorTransport implements OrchestratorTransport {
  constructor(
    private readonly endpoint: string,
    private readonly adminToken: string,
    private readonly fetchImpl: typeof fetch = fetch.bind(globalThis),
  ) {}

  async send(task: ExecutionTaskRow): Promise<OrchestratorResponse> {
    try {
      const res = await this.fetchImpl(`${this.endpoint.replace(/\/$/, "")}/execution-tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.adminToken}`,
        },
        body: JSON.stringify({
          taskId: task.id,
          type: task.type,
          domain: task.domain,
          riskLevel: task.risk_level,
          payload: task.payload,
          requestedBy: task.requested_by,
          approvedBy: task.approved_by,
          attemptCount: task.attempt_count,
          maxAttempts: task.max_attempts,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          status: "FAILED",
          error: `orchestrator returned HTTP ${res.status}: ${body.slice(0, 500)}`,
        };
      }
      const data = (await res.json().catch(() => ({}))) as Partial<OrchestratorResponse>;
      return {
        status: data.status === "SUCCESS" ? "SUCCESS" : "FAILED",
        result: data.result,
        error: data.error,
      };
    } catch (e) {
      return {
        status: "FAILED",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

/**
 * Soft handoff transport — when no real orchestrator endpoint is configured,
 * we DO NOT mark the task as RUNNING/FAILED. Instead `dispatch()` short-circuits
 * via `isPendingHandoff` and the row stays in PENDING for the server-side
 * execution loop (task #711) to pick up. This preserves phase-1's "no
 * autonomous execution" guarantee without poisoning the audit trail.
 */
export class PendingHandoffTransport implements OrchestratorTransport {
  readonly isPendingHandoff = true;
  async send(_task: ExecutionTaskRow): Promise<OrchestratorResponse> {
    // Soft handoff — caller short-circuits via `isPendingHandoff` before this
    // is ever invoked, but if it is, return PENDING (not FAILED) so metrics
    // and callers do not interpret the handoff as an orchestrator failure.
    return {
      status: "PENDING",
      error: "PENDING_HANDOFF: no orchestrator transport configured — server loop will consume",
    };
  }
}

export function getDefaultTransport(): OrchestratorTransport {
  const url = readServerEnv(ORCHESTRATOR_URL_ENV_KEY);
  const token = readServerEnv(ORCHESTRATOR_TOKEN_ENV_KEY);
  if (url && token) {
    return new HttpOrchestratorTransport(url, token);
  }
  return new PendingHandoffTransport();
}
