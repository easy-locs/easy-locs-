/**
 * MessageMultiSelect — Multi-select toolbar for bulk message actions.
 * Supports: bulk delete (for me), bulk delete (for everyone), bulk forward, copy all.
 */
import { useState } from "react";
import { Trash2, Copy, Forward, X, CheckSquare } from "lucide-react";
import ForwardMessageDialog from "@/components/communication/ForwardMessageDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Props {
  selectedIds: Set<string>;
  messages: Array<{ id: string; content: string; sender_id: string; attachment_url?: string }>;
  currentUserId?: string;
  onClearSelection: () => void;
  onDeletedForMe: (ids: string[]) => void;
  onDeletedForAll: (ids: string[]) => void;
}

export default function MessageMultiSelectToolbar({
  selectedIds, messages, currentUserId, onClearSelection, onDeletedForMe, onDeletedForAll,
}: Props) {
  const [confirmAction, setConfirmAction] = useState<"deleteMe" | "deleteAll" | null>(null);
  const [processing, setProcessing] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const selectedMessages = messages.filter(m => selectedIds.has(m.id));
  const allMine = selectedMessages.every(m => m.sender_id === currentUserId);

  const handleCopyAll = () => {
    const text = selectedMessages.map(m => m.content).join("\n\n");
    navigator.clipboard.writeText(text);
    haptic("light");
    toast.success(`${count} messages copied`);
    onClearSelection();
  };

  const handleDeleteForMe = async () => {
    setProcessing(true);
    haptic("medium");
    const ids = Array.from(selectedIds);
    onDeletedForMe(ids);
    setConfirmAction(null);
    onClearSelection();
    setProcessing(false);
    toast.success(`${count} messages hidden`);
  };

  const handleDeleteForAll = async () => {
    setProcessing(true);
    haptic("medium");
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        await supabase.from("messages").update({
          deleted_for_all: true,
          deleted_at: new Date().toISOString(),
          deleted_by: currentUserId,
          deletion_reason: "user_action",
          content: "🚫 This message was deleted",
          attachment_url: null,
          audio_url: null,
          audio_duration_seconds: null,
        } as any).eq("id", id);
      }
      onDeletedForAll(ids);
      toast.success(`${count} messages deleted for everyone`);
    } catch (e: any) {
      toast.error("Failed to delete some messages");
    }
    setConfirmAction(null);
    onClearSelection();
    setProcessing(false);
  };

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{
          background: "hsl(var(--hud-surface) / 0.8)",
          borderBottom: "1px solid hsl(var(--hud-border) / 0.12)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Button variant="ghost" size="icon" onClick={onClearSelection} className="h-8 w-8 rounded-full">
          <X className="h-4 w-4" style={{ color: "hsl(var(--hud-text))" }} />
        </Button>
        <span className="text-sm font-semibold flex-1" style={{ color: "hsl(var(--hud-text))" }}>
          {count} selected
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopyAll} className="h-8 w-8 rounded-full" title="Copy">
            <Copy className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setConfirmAction("deleteMe")} className="h-8 w-8 rounded-full" title="Delete for me">
            <Trash2 className="h-4 w-4" style={{ color: "hsl(var(--hud-danger))" }} />
          </Button>
          {allMine && (
            <Button variant="ghost" size="icon" onClick={() => setConfirmAction("deleteAll")} className="h-8 w-8 rounded-full" title="Delete for everyone">
              <Trash2 className="h-4 w-4" style={{ color: "hsl(var(--destructive))" }} />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "deleteMe" ? "Delete for me?" : "Delete for everyone?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "deleteMe"
                ? `${count} message(s) will be hidden from your view only.`
                : `${count} message(s) will be deleted for all participants.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={processing}
              onClick={confirmAction === "deleteMe" ? handleDeleteForMe : handleDeleteForAll}
            >
              {processing ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
