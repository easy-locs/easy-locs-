/**
 * AgentActionsMenu — L4 cockpit (#813)
 *
 * Audited control actions for a single registered agent. Every action
 * routes through `system.set_agent_status`, which:
 *   • requires super_admin at the DB layer,
 *   • appends to `public.agent_command_history` for audit,
 *   • is the only legal write path to `system.agents.status`.
 *
 * Optimistic UI: the row's `status` is patched in the React-Query cache
 * the moment the user clicks; on RPC failure the cache is rolled back
 * and a destructive toast surfaces the error.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MoreHorizontal,
  Power,
  PowerOff,
  FlaskConical,
  Archive,
  Loader2,
} from "lucide-react";

interface Props {
  agent: AgentRow;
}

export default function AgentActionsMenu({ agent }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState<AgentLifecycleStatus | null>(null);
  /**
   * Destructive lifecycle transitions (`disable`, `deprecate`) require an
   * explicit confirmation step — the operator must read the consequence
   * sentence before committing. Non-destructive transitions (`enable`,
   * `canary`) bypass this gate so they remain fast under incident.
   */
  const [confirm, setConfirm] = useState<{
    status: AgentLifecycleStatus;
    label: string;
    consequence: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: (input: {
      status: AgentLifecycleStatus;
      canaryPct?: number | null;
    }) =>
      agentsRepo.setAgentStatus({
        slug: agent.slug,
        status: input.status,
        canaryPct: input.canaryPct ?? null,
      }),
    onMutate: async (input) => {
      setPending(input.status);
      await qc.cancelQueries({ queryKey: ["admin-agents", "list"] });
      const prev = qc.getQueryData<AgentRow[]>(["admin-agents", "list"]);
      qc.setQueryData<AgentRow[]>(["admin-agents", "list"], (old) =>
        (old ?? []).map((r) =>
          r.id === agent.id
            ? {
                ...r,
                status: input.status,
                canary_pct:
                  input.status === "canary"
                    ? input.canaryPct ?? r.canary_pct
                    : r.canary_pct,
              }
            : r,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-agents", "list"], ctx.prev);
      toast({
        title: "Action failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    },
    onSuccess: (_d, vars) => {
      toast({
        title: "Agent updated",
        description: `${agent.display_name} → ${vars.status}`,
      });
    },
    onSettled: () => {
      setPending(null);
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
    },
  });

  const setStatus = (status: AgentLifecycleStatus, canaryPct?: number) =>
    mutation.mutate({ status, canaryPct: canaryPct ?? null });

  const requestDestructive = (
    status: AgentLifecycleStatus,
    label: string,
    consequence: string,
  ) => setConfirm({ status, label, consequence });

  const isActive = agent.status === "active";
  const isDisabled = agent.status === "disabled";
  const busy = mutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={busy}
          data-testid={`agent-actions-${agent.id}`}
          aria-label={`Actions for ${agent.display_name}`}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MoreHorizontal className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[0.625rem] uppercase tracking-wide">
          Lifecycle
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled={isActive || busy}
          onClick={() => setStatus("active")}
          data-testid="agent-action-enable"
        >
          <Power className="w-3.5 h-3.5 mr-2" />
          Enable
          {pending === "active" && (
            <Loader2 className="w-3 h-3 ml-auto animate-spin" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isDisabled || busy}
          onClick={() =>
            requestDestructive(
              "disabled",
              "Disable agent",
              "New work will stop being routed to this agent. In-flight runs continue but no new tasks will be accepted.",
            )
          }
          data-testid="agent-action-disable"
        >
          <PowerOff className="w-3.5 h-3.5 mr-2" />
          Disable
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy}
          onClick={() => setStatus("canary", 10)}
          data-testid="agent-action-canary"
        >
          <FlaskConical className="w-3.5 h-3.5 mr-2" />
          Canary 10%
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy}
          onClick={() => setStatus("canary", 50)}
        >
          <FlaskConical className="w-3.5 h-3.5 mr-2" />
          Canary 50%
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={agent.status === "deprecated" || busy}
          onClick={() =>
            requestDestructive(
              "deprecated",
              "Deprecate version",
              "The agent will be marked deprecated and removed from the active router. This is a hard archive — only roll forward to a new version after this.",
            )
          }
          data-testid="agent-action-deprecate"
          className="text-destructive focus:text-destructive"
        >
          <Archive className="w-3.5 h-3.5 mr-2" />
          Deprecate version
        </DropdownMenuItem>
      </DropdownMenuContent>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent data-testid="agent-action-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.label} — {agent.display_name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.consequence} This action is recorded in the audit
              trail (agent_command_history).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="agent-action-confirm-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="agent-action-confirm-ok"
              onClick={() => {
                if (confirm) {
                  setStatus(confirm.status);
                  setConfirm(null);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
