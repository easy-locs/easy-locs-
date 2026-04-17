import { Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SlashCommand } from "./slash-commands";

interface Props {
  rawInput: string;
  expanded: string;
  command: SlashCommand | null;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

export function CommandGhostPreview({ rawInput, expanded, command, onConfirm, onCancel, onEdit }: Props) {
  const description =
    command?.kind === "local"
      ? command.localAction === "clear"
        ? "Clear the entire conversation locally."
        : command.localAction === "history"
        ? "Toggle the command history split view."
        : command.localAction === "sidebar"
        ? "Toggle the agent status sidebar."
        : "Show the slash-command help list."
      : command
      ? `Send to Chief Agent: \u201C${expanded || command.cmd}\u201D`
      : `Send to Chief Agent: \u201C${expanded}\u201D`;

  return (
    <div
      role="dialog"
      aria-label="Command preview"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm shadow-sm"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider">
              Preview · about to run
            </div>
            <div className="text-foreground/90 mt-0.5 break-words">{description}</div>
            {command && command.kind !== "local" && rawInput !== expanded && (
              <div className="text-[11px] text-muted-foreground mt-1 truncate">
                Original: <span className="font-mono">{rawInput}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" className="h-8 rounded-xl text-xs gap-1.5" onClick={onConfirm}>
              <Check className="h-3.5 w-3.5" /> Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl text-xs"
              onClick={onEdit}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-xl text-xs gap-1.5"
              onClick={onCancel}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <span className="text-[10px] text-muted-foreground/70 ml-auto">
              Tip: hold ⌘/Ctrl + Enter to skip preview
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
