/**
 * AgentTriggerDialog — L4 cockpit (#813)
 *
 * Manual trigger for a registered agent. Lets a super-admin pick one
 * of the agent's declared `(domain, task_type)` capabilities and
 * dispatch a fresh execution_task through the standard
 * `taskDispatcher`. The dispatcher applies the same risk classification
 * + approval gating as any other source — the cockpit gets no
 * shortcut around governance.
 *
 * If the task type is CRITICAL or MEDIUM-with-approval, the dispatcher
 * returns a row in `pending_review` and the operator continues in
 * /admin/approvals; this dialog never bypasses the policy engine.
 */
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { taskDispatcher } from "@/core/execution";
import { supabase } from "@/integrations/supabase/client";
import type { AgentRow } from "@/lib/admin/agents-repo";
import { Send, AlertTriangle } from "lucide-react";

interface Props {
  agent: AgentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AgentTriggerDialog({ agent, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const capabilities = useMemo(
    () => agent.capabilities ?? [],
    [agent.capabilities],
  );
  const [capIdx, setCapIdx] = useState(0);
  const [payloadStr, setPayloadStr] = useState("{}");
  const [parseError, setParseError] = useState<string | null>(null);

  const cap = capabilities[capIdx];

  const dispatchMut = useMutation({
    mutationFn: async () => {
      let payload: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(payloadStr || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          payload = parsed as Record<string, unknown>;
        } else {
          throw new Error("payload must be a JSON object");
        }
      } catch (err) {
        throw new Error(`Invalid payload JSON: ${(err as Error).message}`);
      }
      if (!cap) throw new Error("Agent has no declared capabilities to trigger");
      const { data: { user } } = await supabase.auth.getUser();
      const requester = user?.email || user?.id || "admin-agents-cockpit";
      return taskDispatcher.dispatch({
        type: cap.task_type,
        domain: cap.domain,
        payload: { ...payload, source: "AdminAgentsCockpit", agent_slug: agent.slug },
        requestedBy: requester,
        idempotencyKey: `cockpit:${agent.slug}:${cap.task_type}:${Date.now()}`,
      });
    },
    onSuccess: (result) => {
      const status = (result as { task?: { status?: string } } | null)?.task?.status;
      toast({
        title: "Task dispatched",
        description: status
          ? `Task is in status: ${status}`
          : `Task created for ${agent.display_name}`,
      });
      onOpenChange(false);
      setParseError(null);
    },
    onError: (err) => {
      const msg = (err as Error).message;
      if (msg.toLowerCase().startsWith("invalid payload")) {
        setParseError(msg);
        return;
      }
      toast({
        title: "Dispatch failed",
        description: msg,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        data-testid="agent-trigger-dialog"
      >
        <DialogHeader>
          <DialogTitle>Trigger {agent.display_name}</DialogTitle>
          <DialogDescription className="text-xs">
            Dispatches a task through the standard policy engine. Critical or
            approval-gated types will land in <code>pending_review</code> and
            require sign-off in the approvals inbox.
          </DialogDescription>
        </DialogHeader>

        {capabilities.length === 0 ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
            <span>
              This agent has not declared any capabilities yet — there is
              nothing to trigger from the cockpit. Register a capability
              first.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                Capability
              </span>
              <select
                value={capIdx}
                onChange={(e) => setCapIdx(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/40 text-sm text-foreground"
                data-testid="agent-trigger-capability"
              >
                {capabilities.map((c, i) => (
                  <option key={`${c.domain}:${c.task_type}`} value={i}>
                    {c.domain} · {c.task_type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                Payload (JSON object)
              </span>
              <textarea
                rows={5}
                value={payloadStr}
                onChange={(e) => {
                  setPayloadStr(e.target.value);
                  setParseError(null);
                }}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/40 text-xs font-mono text-foreground resize-y"
                data-testid="agent-trigger-payload"
              />
            </label>
            {parseError && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {parseError}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={dispatchMut.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => dispatchMut.mutate()}
            disabled={dispatchMut.isPending || capabilities.length === 0}
            className="gap-1.5"
            data-testid="agent-trigger-submit"
          >
            <Send
              className={`w-3.5 h-3.5 ${
                dispatchMut.isPending ? "animate-pulse" : ""
              }`}
            />
            Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
