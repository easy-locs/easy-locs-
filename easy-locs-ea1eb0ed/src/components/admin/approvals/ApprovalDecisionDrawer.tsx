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
        result: unknown;
        blocked_reason?: string | null;
      })
    | null
    | undefined;

  const diffKind = useMemo(() => {
    const p = task?.payload as Record<string, unknown> | undefined;
    return (p?.diff_kind as string) === "text" ? "text" : "json";
  }, [task]);

  const before = useMemo(() => {
    const p = task?.payload as Record<string, unknown> | undefined;
    return p?.before;
  }, [task]);
  const after = useMemo(() => {
    const p = task?.payload as Record<string, unknown> | undefined;
    return p?.after ?? p?.proposed ?? p;
  }, [task]);
  const unifiedDiff = useMemo(() => {
    const p = task?.payload as Record<string, unknown> | undefined;
    return (p?.unified_diff as string) ?? "";
  }, [task]);

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
                    task.risk_level === "critical" || task.risk_level === "high"
                      ? "destructive"
                      : "secondary"
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
