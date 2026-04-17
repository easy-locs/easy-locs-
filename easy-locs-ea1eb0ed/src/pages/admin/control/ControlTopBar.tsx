import { useState } from "react";
import { AlertTriangle, Loader2, Menu, Power, Search, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useControlContext, type HealthLevel } from "./ControlContext";

const LEVEL_DOT: Record<HealthLevel, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  down: "bg-rose-500",
  unknown: "bg-muted-foreground/40",
};

interface ControlTopBarProps {
  onToggleMobileNav: () => void;
}

export default function ControlTopBar({ onToggleMobileNav }: ControlTopBarProps) {
  const { health, killSwitch, killSwitchHandler, setKillSwitch, setPaletteOpen } =
    useControlContext();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onConfirmKill = async () => {
    if (!killSwitchHandler) {
      setConfirmOpen(false);
      return;
    }
    try {
      setKillSwitch({ busy: true });
      await killSwitchHandler();
    } finally {
      setKillSwitch({ busy: false });
      setConfirmOpen(false);
    }
  };

  return (
    <TooltipProvider delayDuration={120}>
      <header
        data-testid="control-top-bar"
        className="flex h-14 items-center gap-2 border-b border-border/40 bg-background/80 px-3 backdrop-blur"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={onToggleMobileNav}
          aria-label="Toggle navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "group flex h-9 flex-1 items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors",
            "hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "max-w-md",
          )}
          aria-label="Open global search and command palette"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search agents, runs, sections…</span>
          <kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] tracking-widest text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-3">
          <ul className="hidden items-center gap-2 sm:flex" aria-label="System health">
            {health.map((h) => (
              <Tooltip key={h.id}>
                <TooltipTrigger asChild>
                  <li
                    data-testid={`health-${h.id}`}
                    data-level={h.level}
                    className="flex items-center gap-1.5 rounded-md border border-border/40 bg-card/60 px-2 py-1 text-[11px] font-medium"
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", LEVEL_DOT[h.level])} />
                    <span className="text-muted-foreground">{h.label}</span>
                  </li>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {h.hint ?? `${h.label}: ${h.level}`}
                </TooltipContent>
              </Tooltip>
            ))}
          </ul>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={killSwitch.engaged ? "destructive" : "outline"}
                size="sm"
                className="h-9 gap-2"
                onClick={() => setConfirmOpen(true)}
                disabled={killSwitch.busy || !killSwitchHandler}
                data-testid="control-kill-switch"
                aria-label="Global kill-switch"
              >
                {killSwitch.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : killSwitch.engaged ? (
                  <ShieldAlert className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                <span className="hidden text-xs sm:inline">
                  {killSwitch.engaged ? "Killed" : "Kill-switch"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {killSwitchHandler
                ? "Halt every running agent immediately"
                : "Kill-switch handler not registered yet"}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {killSwitch.engaged ? "Release kill-switch?" : "Engage global kill-switch?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {killSwitch.engaged
                ? "This will allow agents to resume execution. Make sure the underlying incident is resolved."
                : "This will immediately halt every running agent and pending run. Use only in case of incident."}
              {!killSwitchHandler && (
                <span className="mt-2 block rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
                  Kill-switch handler isn't loaded on this section. Open the
                  Mission Control overview first to register it.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={killSwitch.busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void onConfirmKill();
              }}
              disabled={killSwitch.busy}
              className={killSwitch.engaged ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {killSwitch.engaged ? "Release" : "Engage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
