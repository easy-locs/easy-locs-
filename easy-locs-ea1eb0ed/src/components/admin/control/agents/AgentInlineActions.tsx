/**
 * AgentInlineActions — quick row-level actions for the cockpit.
 *
 * Surfaces the four most-used governance verbs as tiny icon buttons on
 * the row itself: Pause (disable), Canary 10%, Redeploy (re-issue same
 * status to write a fresh audit row + nudge supervisors), and View runs
 * (opens the drawer on the Runs tab). Destructive actions confirm; safe
 * ones go straight through. Every transition writes to
 * `agent_command_history` via `system.set_agent_status`.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, FlaskConical, RefreshCcw, ListChecks, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  agentsRepo,
  type AgentLifecycleStatus,
  type AgentRow,
} from "@/lib/admin/agents-repo";
import { cn } from "@/lib/utils";

interface Props {
  agent: AgentRow;
  onViewRuns: () => void;
}

type Confirm =
  | null
  | {
      label: string;
      consequence: string;
      run: () => void;
    };

export default function AgentInlineActions({ agent, onViewRuns }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<Confirm>(null);

  const mutation = useMutation({
    mutationFn: (input: {
      status: AgentLifecycleStatus;
      canaryPct?: number | null;
      verb: string;
    }) =>
      agentsRepo
        .setAgentStatus({
          slug: agent.slug,
          status: input.status,
          canaryPct: input.canaryPct ?? null,
        })
        .then(() => input),
    onSuccess: (input) => {
      toast({
        title: `${input.verb} · ${agent.display_name}`,
        description:
          input.verb === "Redeploy"
            ? "Re-issued status; supervisor will rebind workers shortly."
            : `Status: ${input.status}${
                input.canaryPct != null ? ` (${input.canaryPct}%)` : ""
              }`,
      });
    },
    onError: (err) => {
      toast({
        title: "Action failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-agents"] }),
  });

  const busy = mutation.isPending;

  const askPause = () =>
    setConfirm({
      label: `Pause ${agent.display_name}`,
      consequence:
        "New work will stop being routed to this agent. In-flight tasks finish; no new tasks are accepted.",
      run: () => mutation.mutate({ status: "disabled", verb: "Pause" }),
    });

  const askRedeploy = () =>
    setConfirm({
      label: `Redeploy ${agent.display_name}`,
      consequence:
        "Re-issues the current status, writes an audit entry, and signals workers to rebind. Safe; in-flight work continues.",
      run: () =>
        mutation.mutate({
          status: agent.status,
          canaryPct: agent.canary_pct,
          verb: "Redeploy",
        }),
    });

  const goCanary = () =>
    mutation.mutate({ status: "canary", canaryPct: 10, verb: "Canary 10%" });

  const isDisabled = agent.status === "disabled";

  return (
    <>
      <div
        className="flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        data-testid={`agent-inline-actions-${agent.slug}`}
      >
        <ActionButton
          label="Pause"
          icon={<Pause className="w-3.5 h-3.5" />}
          onClick={askPause}
          disabled={isDisabled || busy}
          testId={`agent-quick-pause-${agent.slug}`}
        />
        <ActionButton
          label="Canary 10%"
          icon={<FlaskConical className="w-3.5 h-3.5" />}
          onClick={goCanary}
          disabled={busy}
          testId={`agent-quick-canary-${agent.slug}`}
        />
        <ActionButton
          label="Redeploy"
          icon={
            busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="w-3.5 h-3.5" />
            )
          }
          onClick={askRedeploy}
          disabled={busy}
          testId={`agent-quick-redeploy-${agent.slug}`}
        />
        <ActionButton
          label="View runs"
          icon={<ListChecks className="w-3.5 h-3.5" />}
          onClick={onViewRuns}
          testId={`agent-quick-runs-${agent.slug}`}
        />
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent data-testid="agent-inline-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.consequence} Recorded in agent_command_history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="agent-inline-confirm-ok"
              onClick={() => {
                confirm?.run();
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  testId,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {icon}
    </Button>
  );
}
