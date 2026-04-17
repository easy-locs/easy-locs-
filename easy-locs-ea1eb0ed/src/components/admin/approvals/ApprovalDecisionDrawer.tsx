/**
 * ApprovalDecisionDrawer (#812)
 *
 * Sheet-based reviewer cockpit. Loads the full task row + decisions log,
 * picks the right diff renderer based on `intent_payload.diff_kind`
 * (`json` default, `text` for unified diffs), and posts the decision via
 * `dashboardRepo.decideTaskApproval`. Uses an optimistic React Query
 * cache update so the parent table reacts instantly; rolls back on
 * server error.
 */
import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import JsonDiffView from "./JsonDiffView";
import TextDiffView from "./TextDiffView";

type DecisionKind = "approved" | "rejected" | "changes_requested" | "comment";

export interface ApprovalDecisionDrawerProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function makeClientReq(taskId: string, kind: DecisionKind) {
  // Stable per (task, kind, mount). Using crypto.randomUUID() once per
  // open keeps retries idempotent for THIS drawer session, but a new
  // session can re-decide if the previous attempt truly failed.
  return `ui:${taskId}:${kind}:${
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  }`;
}

export function ApprovalDecisionDrawer({
  taskId,
  open,
  onOpenChange,
}: ApprovalDecisionDrawerProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setComment("");
      setReason("");
    }
  }, [open, taskId]);

  const taskQuery = useQuery({
    queryKey: ["admin-approvals", "task", taskId],
    enabled: open && !!taskId,
    queryFn: () => dashboardRepo.fetchExecutionTaskById(taskId!),
  });

  const decisionsQuery = useQuery({
    queryKey: ["admin-approvals", "decisions", taskId],
    enabled: open && !!taskId,
    queryFn: () => dashboardRepo.fetchTaskApprovals(taskId!),
  });

  const mutation = useMutation({
    mutationFn: (input: {
      decision: DecisionKind;
      reason?: string;
      commentMd?: string;
    }) =>
      dashboardRepo.decideTaskApproval({
        taskId: taskId!,
        decision: input.decision,
        reason: input.reason ?? null,
        commentMd: input.commentMd ?? null,
        clientRequestId: makeClientReq(taskId!, input.decision),
      }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["admin-approvals", "queue"] });
      const previous = qc.getQueryData<unknown[]>([
        "admin-approvals",
        "queue",
      ]);
      // Optimistically pull the task off the queue if the decision is
      // terminal (approved / rejected / changes_requested). A pure
      // `comment` keeps it in pending_review so we don't drop it.
      if (input.decision !== "comment" && previous && Array.isArray(previous)) {
        qc.setQueryData(
          ["admin-approvals", "queue"],
          previous.filter(
            (row) =>
              !row || typeof row !== "object" || (row as { id?: string }).id !== taskId,
          ),
        );
      }
      return { previous };
    },
    onError: (err: Error, _input, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(["admin-approvals", "queue"], ctx.previous);
      }
      toast({
        title: "Decision failed",
        description: err.message,
        variant: "destructive",
      });
    },
    onSuccess: (_data, input) => {
      toast({
        title:
          input.decision === "approved"
            ? "Task approved"
            : input.decision === "rejected"
              ? "Task rejected"
              : input.decision === "changes_requested"
                ? "Changes requested"
                : "Comment added",
      });
      qc.invalidateQueries({ queryKey: ["admin-approvals"] });
      if (input.decision !== "comment") onOpenChange(false);
    },
  });

  const task = taskQuery.data as
    | (Record<string, unknown> & {
        id: string;
        type: string;
        domain: string;
        risk_level: string;
        status: string;
        payload: unknown;
        previous_state?: unknown;
        result?: unknown;
        execution_result?: unknown;
        blocked_reason?: string | null;
        agent_id?: string | null;
      })
    | null
    | undefined;

  /**
   * LB1 #834 — AI metadata surface.
   *
   * Held AI runs land in the same approvals inbox as every other agent
   * kind, so reviewers must be able to see the AI-specific signals
   * (purpose, tool calls, verifier outcome, generated response) without
   * spelunking raw JSON. We pull from `execution_result` first (canonical
   * post-execute payload written by the AI adapter) and fall back to
   * `payload` for legacy rows.
   */
  const aiMeta = useMemo(() => {
    // Canonical orchestrator shape (LB1 #834):
    //   execution_result = { output, logs, actions_taken, verification }
    // and the AI adapter places its generated response/tools inside
    // `output`. We read from `execution_result` first, fall back to the
    // legacy `result` column, then `payload` for very old rows.
    const exec = task?.execution_result as
      | Record<string, unknown>
      | undefined;
    const legacyResult = task?.result as Record<string, unknown> | undefined;
    const payload = task?.payload as Record<string, unknown> | undefined;
    const output =
      ((exec?.output as Record<string, unknown> | undefined) ??
        legacyResult ??
        payload) ?? undefined;
    if (!output && !exec && !payload) return null;
    const purpose =
      (output?.purpose as string | undefined) ??
      (payload?.purpose as string | undefined);
    const verification =
      ((exec?.verification as Record<string, unknown> | undefined) ??
        (output?.verification as Record<string, unknown> | undefined)) ??
      undefined;
    const tools = ((output?.tools_used ?? output?.tools) as
      | Array<unknown>
      | undefined) ?? undefined;
    const response =
      (output?.response as string | undefined) ??
      (output?.text as string | undefined) ??
      (output?.output_text as string | undefined);
    if (!purpose && !verification && !tools && !response) return null;
    return { purpose, verification, tools, response };
  }, [task]);

  /**
   * Diff sourcing contract (L5):
   *   • baseline (before)   = `execution_tasks.previous_state`
   *   • proposal (after)    = `intent_payload` — i.e. `payload.intent_payload`
   *                            when present, otherwise the whole `payload`.
   *   • diff_kind / unified_diff = read from the intent_payload itself so
   *     future build agents can ship code patches via
   *     `intent_payload.diff_kind === 'text'` + `intent_payload.unified_diff`.
   * Falls back to legacy `payload.before/after/proposed` shapes so older
   * tasks still render without a re-emit.
   */
  const intentPayload = useMemo<Record<string, unknown> | undefined>(() => {
    const p = task?.payload as Record<string, unknown> | undefined;
    if (!p) return undefined;
    const nested = p.intent_payload as Record<string, unknown> | undefined;
    return nested ?? p;
  }, [task]);

  const diffKind = useMemo(() => {
    const ip = intentPayload;
    const legacy = task?.payload as Record<string, unknown> | undefined;
    const kind = (ip?.diff_kind as string) ?? (legacy?.diff_kind as string);
    return kind === "text" ? "text" : "json";
  }, [intentPayload, task]);

  const before = useMemo(() => {
    if (task?.previous_state !== undefined && task.previous_state !== null) {
      return task.previous_state;
    }
    const legacy = task?.payload as Record<string, unknown> | undefined;
    return legacy?.before;
  }, [task]);

  const after = useMemo(() => {
    const ip = intentPayload;
    const legacy = task?.payload as Record<string, unknown> | undefined;
    return ip ?? legacy?.after ?? legacy?.proposed ?? legacy;
  }, [intentPayload, task]);

  const unifiedDiff = useMemo(() => {
    const ip = intentPayload;
    const legacy = task?.payload as Record<string, unknown> | undefined;
    return (
      (ip?.unified_diff as string) ??
      (legacy?.unified_diff as string) ??
      ""
    );
  }, [intentPayload, task]);

  const submit = (decision: DecisionKind) => {
    if (!taskId) return;
    mutation.mutate({
      decision,
      reason: reason.trim() || undefined,
      commentMd: comment.trim() || undefined,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        data-testid="approval-decision-drawer"
      >
        <SheetHeader>
          <SheetTitle>Decision · {task?.type ?? "task"}</SheetTitle>
          <SheetDescription asChild>
            {task ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{task.domain}</Badge>
                <Badge
                  variant={
                    task.risk_level === "CRITICAL" ? "destructive" : "secondary"
                  }
                >
                  {task.risk_level}
                </Badge>
                <span className="text-muted-foreground font-mono">
                  {task.id.slice(0, 8)}
                </span>
              </div>
            ) : (
              <span>Loading…</span>
            )}
          </SheetDescription>
        </SheetHeader>

        {taskQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !task ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Task not found.
          </div>
        ) : (
          <Tabs defaultValue="diff" className="mt-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="diff">Diff</TabsTrigger>
              <TabsTrigger value="payload">Payload</TabsTrigger>
              <TabsTrigger value="decisions">
                Decisions ({decisionsQuery.data?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="diff" className="mt-3">
              {task.blocked_reason && (
                <div className="text-xs text-warning-foreground bg-warning/10 border border-warning/30 rounded px-2 py-1.5 mb-2">
                  <span className="font-semibold">Blocked reason:</span>{" "}
                  {task.blocked_reason}
                </div>
              )}
              {aiMeta && (
                <div
                  data-testid="ai-metadata-panel"
                  className="mb-3 rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2 text-xs"
                >
                  <div className="font-semibold text-foreground">
                    AI run metadata
                  </div>
                  {aiMeta.purpose && (
                    <div>
                      <span className="text-muted-foreground">Purpose: </span>
                      <span className="font-mono">{aiMeta.purpose}</span>
                    </div>
                  )}
                  {aiMeta.verification && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Verifier</div>
                      <pre className="font-mono text-[0.625rem] bg-background/60 border border-border/40 rounded p-1.5 overflow-x-auto">
                        {JSON.stringify(aiMeta.verification, null, 2)}
                      </pre>
                    </div>
                  )}
                  {aiMeta.tools && aiMeta.tools.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        Tools used ({aiMeta.tools.length})
                      </div>
                      <pre className="font-mono text-[0.625rem] bg-background/60 border border-border/40 rounded p-1.5 overflow-x-auto max-h-32">
                        {JSON.stringify(aiMeta.tools, null, 2)}
                      </pre>
                    </div>
                  )}
                  {aiMeta.response && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        Generated response (held for review)
                      </div>
                      <div className="whitespace-pre-wrap text-foreground bg-background/60 border border-border/40 rounded p-2 max-h-48 overflow-y-auto">
                        {aiMeta.response}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {diffKind === "text" ? (
                <TextDiffView unifiedDiff={unifiedDiff} />
              ) : (
                <JsonDiffView before={before} after={after} />
              )}
            </TabsContent>

            <TabsContent value="payload" className="mt-3">
              <pre className="text-[0.625rem] font-mono bg-muted/40 border border-border/40 rounded-lg p-2 overflow-x-auto max-h-96">
                {JSON.stringify(task.payload, null, 2)}
              </pre>
            </TabsContent>

            <TabsContent value="decisions" className="mt-3 space-y-2">
              {(decisionsQuery.data ?? []).length === 0 ? (
                <div className="text-xs italic text-muted-foreground py-4 text-center">
                  No prior decisions.
                </div>
              ) : (
                (decisionsQuery.data ?? []).map((d) => {
                  const row = d as Record<string, unknown>;
                  return (
                    <div
                      key={String(row.id)}
                      data-testid="decision-row"
                      className="border border-border/40 rounded p-2 text-xs space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {String(row.decision)}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(
                            String(row.decided_at),
                          ).toLocaleString()}
                        </span>
                      </div>
                      {row.reason ? (
                        <div className="text-foreground">
                          {String(row.reason)}
                        </div>
                      ) : null}
                      {row.comment_md ? (
                        <div className="text-muted-foreground whitespace-pre-wrap">
                          {String(row.comment_md)}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-6 space-y-3 border-t border-border pt-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Reason (short, required for reject / changes_requested)
            </label>
            <Textarea
              data-testid="decision-reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Price exceeds policy ceiling"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Comment (markdown, optional)
            </label>
            <Textarea
              data-testid="decision-comment-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Long-form notes that stay on the audit log"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              data-testid="decide-approve"
              onClick={() => submit("approved")}
              disabled={mutation.isPending || !taskId}
            >
              Approve
            </Button>
            <Button
              data-testid="decide-reject"
              variant="destructive"
              onClick={() => submit("rejected")}
              disabled={mutation.isPending || !taskId || !reason.trim()}
            >
              Reject
            </Button>
            <Button
              data-testid="decide-changes"
              variant="outline"
              onClick={() => submit("changes_requested")}
              disabled={mutation.isPending || !taskId || !reason.trim()}
            >
              Request changes
            </Button>
            <Button
              data-testid="decide-comment"
              variant="ghost"
              onClick={() => submit("comment")}
              disabled={mutation.isPending || !taskId || !comment.trim()}
            >
              Comment only
            </Button>
            {mutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin self-center text-muted-foreground" />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ApprovalDecisionDrawer;
