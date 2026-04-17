/**
 * ACP Agent 7 (#866) — Replay dialog.
 *
 * Re-dispatches an existing run via the canonical `taskDispatcher`
 * (the same path used by ExecutionTaskPanel's Retry control). The
 * operator can edit the prompt before replaying; the new task is
 * linked to the original via `parentTaskId` and gets a fresh
 * idempotency key so the dispatcher does not de-duplicate it.
 *
 * Approval is NEVER auto-carried over: critical/medium tasks land in
 * `pending_review` exactly as they would on first dispatch. We surface
 * the resulting status, the new task id, and any blocked_reason so the
 * operator knows where to follow up (typically the approvals inbox).
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCw, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { db } from "@/services/db";
import { taskDispatcher } from "@/core/execution";
import type { AgentRunRichRow } from "@/lib/admin/agents-repo";

interface ReplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: AgentRunRichRow | null;
  domain: string;
}

interface ReplayResult {
  taskId: string;
  status: string;
  blockedReason: string | null;
}

export default function ReplayDialog({ open, onOpenChange, run, domain }: ReplayDialogProps) {
  const [prompt, setPrompt] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ReplayResult | null>(null);

  const replayMut = useMutation({
    mutationFn: async () => {
      if (!run) throw new Error("No run selected");
      const { data: { user } } = await db.auth.getUser();
      const requester = user?.email || user?.id || "control-runs-explorer";
      const dispatchResult = await taskDispatcher.dispatch({
        type: run.type,
        domain,
        payload: { prompt, replay_of: run.task_id },
        requestedBy: requester,
        parentTaskId: run.task_id,
        idempotencyKey: `replay:${run.task_id}:${Date.now()}`,
      });
      return {
        taskId: dispatchResult.task?.id ?? "",
        status: dispatchResult.task?.status ?? "unknown",
        blockedReason: dispatchResult.task?.blocked_reason ?? null,
      } satisfies ReplayResult;
    },
    onSuccess: (r) => setResult(r),
  });

  // Re-seed the editable prompt only when the dialog opens or when the
  // selected run id changes. We must NOT depend on the `run` object
  // identity — the parent polls every 15s, so a new object reference
  // for the same run id would otherwise wipe operator edits mid-flight.
  const runId = run?.task_id ?? null;
  const initialPrompt = run?.prompt ?? "";
  useEffect(() => {
    if (open && runId) {
      setPrompt(initialPrompt);
      setConfirmed(false);
      setResult(null);
      replayMut.reset();
    }
    // Intentionally exclude `initialPrompt` and `replayMut` — only the
    // open transition / run id change should reset the dialog so the
    // operator's edits survive a parent poll refetch.
  }, [open, runId]);

  function handleClose(next: boolean) {
    if (!next) {
      setPrompt("");
      setConfirmed(false);
      setResult(null);
      replayMut.reset();
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Replay run
          </DialogTitle>
          <DialogDescription>
            Re-dispatches{" "}
            {runId ? <code className="font-mono text-xs">{runId.slice(0, 12)}…</code> : "this run"}{" "}
            with the prompt below. The new task is linked to the original via parent_task_id and
            follows the same approval policy as a fresh dispatch.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="replay-prompt">
                Prompt (editable)
              </label>
              <textarea
                id="replay-prompt"
                className="w-full rounded border bg-background p-2 text-xs font-mono min-h-[160px] focus:outline-none focus:ring-1 focus:ring-ring"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Edit the prompt before replaying…"
              />
              <p className="text-[11px] text-muted-foreground">
                type=<code className="font-mono">{run?.type ?? "—"}</code> · domain=
                <code className="font-mono">{domain}</code>
              </p>
            </div>

            <div className="rounded border border-warning/40 bg-warning/5 p-2 flex items-start gap-2 text-xs">
              <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-warning font-medium">Confirm replay</div>
                <p className="text-muted-foreground">
                  Replay will create a new execution task. Sensitive types may require manual
                  approval before the run executes.
                </p>
                <label className="inline-flex items-center gap-2 text-foreground mt-1">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I understand and want to replay this run.
                </label>
              </div>
            </div>

            {replayMut.isError ? (
              <div className="text-xs text-destructive flex items-start gap-1">
                <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                {(replayMut.error as Error).message}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!confirmed || !prompt.trim() || replayMut.isPending || !run}
                onClick={() => replayMut.mutate()}
              >
                {replayMut.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Dispatching…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1.5" /> Replay
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded border border-success/40 bg-success/5 p-3">
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" /> Replay dispatched
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                New task id:{" "}
                <code className="font-mono text-foreground">{result.taskId || "—"}</code>
              </div>
              <div className="text-xs text-muted-foreground">
                status: <code className="font-mono text-foreground">{result.status}</code>
              </div>
              {result.blockedReason ? (
                <div className="text-xs text-warning mt-1">
                  Blocked: {result.blockedReason}
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => handleClose(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
