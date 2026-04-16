/**
 * AgentCommandConsole — task #712
 *
 * STRICTLY structured dispatcher UI. The console exposes only:
 *   - a fixed dropdown of predefined task TYPES (sourced from the
 *     risk-classification module — no freeform type entry),
 *   - a fixed dropdown of allowed DOMAINS,
 *   - a structured PAYLOAD form whose fields adapt to the selected type.
 *
 * Freeform text is permitted ONLY as values inside known payload fields
 * (e.g. a description). It is NEVER accepted as the task type, the domain,
 * or as a raw command string that bypasses classification.
 *
 * For CRITICAL task types, dispatch is gated behind an explicit "I authorize
 * this critical task" checkbox. When checked, `approved_by` is populated
 * with the current admin's email/uid and `approved_at` is recorded server-
 * side as part of the dispatch RPC.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/services/db";
import {
  ALLOWED_DISPATCH_DOMAINS,
  classifyTaskType,
  mediumRequiresApproval,
  SAFE_TASK_TYPES,
  MEDIUM_TASK_TYPES,
  CRITICAL_TASK_TYPES,
  taskDispatcher,
  type RiskLevel,
} from "@/core/execution";
import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import { AlertTriangle, ShieldAlert, Send, CheckCircle2, XCircle, Activity } from "lucide-react";

/**
 * Allowed dispatcher domains come from the central registry in
 * `core/execution/allowed-domains` so the dropdown can never drift from the
 * backend's allowed-domain list. This file deliberately does NOT redeclare
 * the list locally.
 */
const ALLOWED_DOMAINS = ALLOWED_DISPATCH_DOMAINS;

type PayloadFieldKind = "text" | "textarea" | "number" | "url";
interface PayloadField {
  key: string;
  label: string;
  kind: PayloadFieldKind;
  required?: boolean;
  placeholder?: string;
}

/**
 * Per-task-type payload schemas. Keys are the only payload fields the form
 * exposes — anything not in this list cannot be entered via the console.
 */
const PAYLOAD_SCHEMAS: Record<string, PayloadField[]> = {
  ANALYSIS: [
    { key: "target", label: "Analysis target", kind: "text", required: true, placeholder: "e.g. listings:stale" },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  VALIDATION: [
    { key: "target", label: "Validation target", kind: "text", required: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  RETRY: [
    { key: "originalTaskId", label: "Original task id", kind: "text", required: true },
    { key: "description", label: "Reason", kind: "textarea" },
  ],
  RESYNC: [
    { key: "source", label: "Source", kind: "text", required: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  REPORT_GENERATION: [
    { key: "reportName", label: "Report name", kind: "text", required: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  INCIDENT_CLASSIFICATION: [
    { key: "incidentId", label: "Incident id", kind: "text", required: true },
    { key: "description", label: "Notes", kind: "textarea" },
  ],
  NON_SENSITIVE_DEDUP: [
    { key: "table", label: "Table", kind: "text", required: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  READ_ONLY_QUERY: [
    { key: "queryName", label: "Query name", kind: "text", required: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  CACHE_REFRESH: [
    { key: "cacheKey", label: "Cache key", kind: "text", required: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  UI_FIX: [
    { key: "surface", label: "Surface", kind: "text", required: true, placeholder: "e.g. dashboard.header" },
    { key: "description", label: "Fix description", kind: "textarea", required: true },
  ],
  NON_CRITICAL_DATA_FIX: [
    { key: "table", label: "Table", kind: "text", required: true },
    { key: "description", label: "Fix description", kind: "textarea", required: true },
  ],
  REVIEW_QUEUE_RESOLUTION: [
    { key: "reviewId", label: "Review id", kind: "text", required: true },
    { key: "description", label: "Resolution notes", kind: "textarea" },
  ],
  NOTIFICATION_DISPATCH: [
    { key: "audience", label: "Audience", kind: "text", required: true },
    { key: "description", label: "Message", kind: "textarea", required: true },
  ],
  NON_SENSITIVE_BULK_UPDATE: [
    { key: "table", label: "Table", kind: "text", required: true },
    { key: "description", label: "Update description", kind: "textarea", required: true },
  ],
};

/** Default payload for any CRITICAL type — operator describes intent. */
const CRITICAL_DEFAULT_FIELDS: PayloadField[] = [
  { key: "target", label: "Target", kind: "text", required: true },
  { key: "description", label: "Justification", kind: "textarea", required: true },
];

const ALL_TYPES: { type: string; risk: RiskLevel }[] = [
  ...SAFE_TASK_TYPES.map((t) => ({ type: t, risk: "SAFE" as const })),
  ...MEDIUM_TASK_TYPES.map((t) => ({ type: t, risk: "MEDIUM" as const })),
  ...CRITICAL_TASK_TYPES.map((t) => ({ type: t, risk: "CRITICAL" as const })),
];

function fieldsFor(type: string): PayloadField[] {
  if (PAYLOAD_SCHEMAS[type]) return PAYLOAD_SCHEMAS[type];
  // Critical types without an explicit schema still get the default JI form.
  return CRITICAL_DEFAULT_FIELDS;
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const variant =
    risk === "SAFE" ? "success" : risk === "MEDIUM" ? "warning" : "destructive";
  return <Badge variant={variant as never}>{risk}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "SUCCESS"
      ? "success"
      : status === "RUNNING"
        ? "info"
        : status === "PENDING"
          ? "warning"
          : status === "BLOCKED" || status === "FAILED"
            ? "destructive"
            : "secondary";
  return <Badge variant={variant as never}>{status}</Badge>;
}

export function AgentCommandConsole() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>(SAFE_TASK_TYPES[0]);
  const [selectedDomain, setSelectedDomain] = useState<string>(ALLOWED_DOMAINS[0]);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [authorized, setAuthorized] = useState(false);
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const risk = useMemo(() => classifyTaskType(selectedType), [selectedType]);
  const fields = useMemo(() => fieldsFor(selectedType), [selectedType]);
  const requiresAuth =
    risk === "CRITICAL" ||
    (risk === "MEDIUM" && mediumRequiresApproval(selectedType));

  // Reset payload + authorization when the type changes — operator must
  // re-confirm intent for the new schema.
  useEffect(() => {
    setPayload({});
    setAuthorized(false);
    setValidationError(null);
  }, [selectedType]);

  const { data: currentUser } = useQuery({
    queryKey: ["agent-console-user"],
    queryFn: async () => {
      const { data } = await db.auth.getUser();
      return data.user;
    },
    staleTime: 60_000,
  });

  const dispatchMut = useMutation({
    mutationFn: async () => {
      // Client-side required-field check. The dispatcher + RPC re-validate
      // server-side so this is purely a UX guardrail.
      const missing = fields
        .filter((f) => f.required)
        .filter((f) => !((payload[f.key] ?? "").trim()))
        .map((f) => f.label);
      if (missing.length > 0) {
        throw new Error(`Missing required field(s): ${missing.join(", ")}`);
      }

      const cleanPayload: Record<string, string> = {};
      for (const f of fields) {
        const v = (payload[f.key] ?? "").trim();
        if (v) cleanPayload[f.key] = v;
      }

      const requester =
        currentUser?.email || currentUser?.id || "command-control-dashboard";

      const result = await taskDispatcher.dispatch({
        type: selectedType,
        domain: selectedDomain,
        payload: { ...cleanPayload, source: "AgentCommandConsole" },
        requestedBy: requester,
        approvedBy: requiresAuth && authorized ? requester : undefined,
        idempotencyKey: `console:${selectedType}:${selectedDomain}:${Date.now()}`,
      });
      return result;
    },
    onSuccess: (result) => {
      setLastTaskId(result.task?.id ?? null);
      setValidationError(null);
      queryClient.invalidateQueries({ queryKey: ["exec-task-panel"] });
      queryClient.invalidateQueries({ queryKey: ["agent-console-task"] });
    },
    onError: (err) => {
      setValidationError((err as Error).message);
    },
  });

  // Live status polling for the last-dispatched task.
  const { data: liveTask } = useQuery({
    queryKey: ["agent-console-task", lastTaskId],
    queryFn: () => dashboardRepo.fetchExecutionTaskById(lastTaskId!),
    enabled: !!lastTaskId,
    refetchInterval: 4000,
    staleTime: 1000,
  });

  const dispatchDisabled =
    dispatchMut.isPending || (requiresAuth && !authorized);

  return (
    <div className="space-y-4">
      <AppCard>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Agent Command Console
            <RiskBadge risk={risk} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type + Domain — both fixed dropdowns. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                Task type
              </span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/40 text-sm text-foreground"
              >
                <optgroup label="SAFE">
                  {SAFE_TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="MEDIUM">
                  {MEDIUM_TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                      {mediumRequiresApproval(t) ? " (approval-gated)" : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="CRITICAL">
                  {CRITICAL_TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>

            <label className="block">
              <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                Domain
              </span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/40 text-sm text-foreground"
              >
                {ALLOWED_DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Adaptive payload form. */}
          <div className="space-y-2">
            <div className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
              Structured payload
            </div>
            <div className="grid grid-cols-1 gap-2">
              {fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-[0.625rem] text-muted-foreground">
                    {f.label}
                    {f.required ? " *" : ""}
                  </span>
                  {f.kind === "textarea" ? (
                    <textarea
                      rows={3}
                      value={payload[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setPayload((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/40 text-sm text-foreground resize-y"
                    />
                  ) : (
                    <input
                      type={f.kind === "number" ? "number" : f.kind === "url" ? "url" : "text"}
                      value={payload[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setPayload((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/40 text-sm text-foreground"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Authorization gate. */}
          {requiresAuth && (
            <div
              className={`rounded-xl border p-3 ${
                risk === "CRITICAL"
                  ? "border-destructive/40 bg-destructive/10"
                  : "border-warning/40 bg-warning/10"
              }`}
            >
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-xs text-foreground">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {risk === "CRITICAL"
                      ? "I authorize this critical task"
                      : "I authorize this approval-gated task"}
                  </span>
                  <span className="block text-[0.6875rem] text-muted-foreground mt-1">
                    Dispatching as <span className="font-mono">{currentUser?.email ?? currentUser?.id ?? "unknown"}</span>.
                    The dispatcher will record this identity in <code>approved_by</code> and the
                    server will set <code>approved_at</code>. Without this checkbox the task is BLOCKED at the database layer.
                  </span>
                </span>
              </label>
            </div>
          )}

          {validationError && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {validationError}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => dispatchMut.mutate()}
              disabled={dispatchDisabled}
              className="gap-1.5"
            >
              <Send className={`w-3.5 h-3.5 ${dispatchMut.isPending ? "animate-pulse" : ""}`} />
              Dispatch task
            </Button>
          </div>
        </CardContent>
      </AppCard>

      {/* Inline live status of the last dispatched task. */}
      {lastTaskId && (
        <AppCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-info" />
              Last dispatched task
              {liveTask && <StatusBadge status={(liveTask as { status: string }).status} />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {!liveTask && (
              <p className="text-muted-foreground">Loading task state…</p>
            )}
            {liveTask && (
              <>
                <div className="flex flex-wrap gap-3 text-[0.6875rem] text-muted-foreground">
                  <span className="font-mono">{(liveTask as { id: string }).id}</span>
                  <span>type: {(liveTask as { type: string }).type}</span>
                  <span>domain: {(liveTask as { domain: string }).domain}</span>
                  <span>
                    attempt {(liveTask as { attempt_count: number }).attempt_count}/
                    {(liveTask as { max_attempts: number }).max_attempts}
                  </span>
                  {(liveTask as { approved_by: string | null }).approved_by && (
                    <span className="text-success">
                      approved by {(liveTask as { approved_by: string }).approved_by}
                    </span>
                  )}
                </div>
                {(liveTask as { blocked_reason: string | null }).blocked_reason && (
                  <div className="text-[0.6875rem] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="break-words">
                      {(liveTask as { blocked_reason: string }).blocked_reason}
                    </span>
                  </div>
                )}
                {(liveTask as { error: string | null }).error && (
                  <div className="text-[0.6875rem] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="break-words font-mono">
                      {(liveTask as { error: string }).error}
                    </span>
                  </div>
                )}
                {(liveTask as { result: Record<string, unknown> | null }).result && (
                  <div>
                    <div className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1">
                      Result
                    </div>
                    <pre className="text-[0.625rem] bg-muted/40 border border-border/40 rounded-lg p-2 overflow-x-auto max-h-40">
                      {JSON.stringify(
                        (liveTask as { result: Record<string, unknown> }).result,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
                {(liveTask as { status: string }).status === "SUCCESS" && (
                  <div className="flex items-center gap-1 text-success text-[0.6875rem]">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed successfully.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </AppCard>
      )}
    </div>
  );
}

export default AgentCommandConsole;
