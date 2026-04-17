/**
 * GlobalKillSwitch — ACP Agent 5 (#864). Wires the shell-level "global
 * kill switch" to the existing control-plane endpoint
 * (`runtime-rpc-client.toggleKillSwitchServer`). Iterates every known
 * feature switch from `getAllKillSwitches()` and disables those still
 * enabled. Confirmation dialog + sonner toast.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Power, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { getAllKillSwitches } from "@/lib/control-plane/kill-switches";
import { toggleKillSwitchServer } from "@/lib/runtime/runtime-rpc-client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onAfterToggle?: () => void;
}

export default function GlobalKillSwitch({ onAfterToggle }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const switches = getAllKillSwitches().filter((s) => s.enabled);
      const actor = user?.email ?? user?.id ?? "control-plane-admin";
      const trimmedReason = reason.trim() || "Global pause from Mission Control";
      let ok = 0;
      let failed = 0;
      for (const sw of switches) {
        const res = await toggleKillSwitchServer(sw.feature, false, actor, trimmedReason);
        if (res && res.ok === false) {
          failed += 1;
        } else {
          ok += 1;
        }
      }
      return { ok, failed, total: switches.length };
    },
    onSuccess: (result) => {
      if (result.total === 0) {
        toast.info("All features were already disabled.");
      } else if (result.failed === 0) {
        toast.success(`Global pause engaged — ${result.ok} features disabled.`);
      } else {
        toast.warning(
          `Global pause partial — ${result.ok}/${result.total} disabled, ${result.failed} failed.`,
        );
      }
      setOpen(false);
      setReason("");
      onAfterToggle?.();
    },
    onError: (err: unknown) => {
      toast.error(
        `Global pause failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    },
  });

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={mutation.isPending}
        data-testid="control-overview-global-kill-switch"
        className="gap-2"
      >
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Power className="w-4 h-4" />
        )}
        Pause global
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent data-testid="control-overview-global-kill-switch-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Engage global kill switch?</AlertDialogTitle>
            <AlertDialogDescription>
              All currently enabled feature switches will be turned off through the
              control-plane endpoint. New work routed through these features will be
              rejected until they are re-enabled. This action is recorded in the
              kill-switch audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block text-xs text-muted-foreground space-y-1">
            <span>Reason (optional)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              placeholder="e.g. payment provider outage at 14:02"
              data-testid="control-overview-global-kill-switch-reason"
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="control-overview-global-kill-switch-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="control-overview-global-kill-switch-confirm-ok"
              onClick={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Pausing…" : "Pause everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
