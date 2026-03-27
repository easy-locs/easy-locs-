/**
 * MessageMultiSelect — Multi-select toolbar for bulk message actions.
 * Supports: bulk delete (for me), bulk delete (for everyone), bulk forward, copy all.
 * Fully i18n-aware.
 */
import { useState } from "react";
import { Trash2, Copy, Forward, X, CheckSquare } from "lucide-react";
import ForwardMessageDialog from "@/components/communication/ForwardMessageDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { platformBus } from "@/lib/shared/platform-bus";

interface Props {
  selectedIds: Set<string>;
  messages: Array<{ id: string; content: string; sender_id: string; attachment_url?: string }>;
  currentUserId?: string;
  currentContextId?: string;
  userEmail?: string;
  userName?: string;
  onClearSelection: () => void;
  onDeletedForMe: (ids: string[]) => void;
  onDeletedForAll: (ids: string[]) => void;
}

export default function MessageMultiSelectToolbar({
  selectedIds, messages, currentUserId, currentContextId, userEmail, userName, onClearSelection, onDeletedForMe, onDeletedForAll,
}: Props) {
  const { t } = useI18n();
  const [confirmAction, setConfirmAction] = useState<"deleteMe" | "deleteAll" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const selectedMessages = messages.filter(m => selectedIds.has(m.id));
  const allMine = selectedMessages.every(m => m.sender_id === currentUserId);

  const handleCopyAll = () => {
    const text = selectedMessages.map(m => m.content).join("\n\n");
    navigator.clipboard.writeText(text);
    haptic("light");
    toast.success(`${count} ${t("orbit.messages_copied") || "messages copied"}`);
    onClearSelection();
  };

  const handleDeleteForMe = async () => {
    setProcessing(true);
    haptic("medium");
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        const msg = messages.find(m => m.id === id);
        if (msg && msg.sender_id === currentUserId) {
          await supabase.from("chat_messages_v2").update({
            deleted_for_sender: true,
            deleted_at: new Date().toISOString(),
            deleted_by: currentUserId,
            deletion_reason: "self_hide",
          } as any).eq("id", id);
        } else {
          const { data: existing } = await (supabase as any)
            .from("chat_messages_v2")
            .select("metadata")
            .eq("id", id)
            .single();
          const meta = (existing?.metadata as Record<string, any>) || {};
          const currentIds: string[] = Array.isArray(meta.deleted_for_user_ids) ? meta.deleted_for_user_ids : [];
          if (currentUserId && !currentIds.includes(currentUserId)) {
            await (supabase as any).from("chat_messages_v2").update({
              metadata: { ...meta, deleted_for_user_ids: [...currentIds, currentUserId] },
            }).eq("id", id);
          }
        }
      }
      onDeletedForMe(ids);
      toast.success(`${count} ${t("orbit.messages_hidden") || "messages hidden"}`);
      platformBus.emit("orbit:message_sent", { type: "bulk_delete_for_me", count: ids.length }, "orbit", { userId: currentUserId });
    } catch (e: any) {
      console.error("[bulk-delete-for-me]", e);
      toast.error("Failed to hide some messages");
    }
    setConfirmAction(null);
    onClearSelection();
    setProcessing(false);
  };

  const handleDeleteForAll = async () => {
    setProcessing(true);
    haptic("medium");
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        await supabase.from("chat_messages_v2").update({
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
      toast.success(`${count} ${t("orbit.messages_deleted_all") || "messages deleted for everyone"}`);
      platformBus.emit("orbit:message_sent", { type: "bulk_delete_for_all", count: ids.length }, "orbit", { userId: currentUserId });
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
          {count} {t("orbit.selected") || "selected"}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopyAll} className="h-8 w-8 rounded-full" title={t("orbit.copy_text") || "Copy"}>
            <Copy className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowForward(true)} className="h-8 w-8 rounded-full" title={t("orbit.forward") || "Forward"}>
            <Forward className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setConfirmAction("deleteMe")} className="h-8 w-8 rounded-full" title={t("orbit.delete_for_me") || "Delete for me"}>
            <Trash2 className="h-4 w-4" style={{ color: "hsl(var(--hud-danger))" }} />
          </Button>
          {allMine && (
            <Button variant="ghost" size="icon" onClick={() => setConfirmAction("deleteAll")} className="h-8 w-8 rounded-full" title={t("orbit.delete_for_all") || "Delete for everyone"}>
              <Trash2 className="h-4 w-4" style={{ color: "hsl(var(--destructive))" }} />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "deleteMe"
                ? (t("orbit.delete_for_me_q") || "Delete for me?")
                : (t("orbit.delete_for_all_q") || "Delete for everyone?")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "deleteMe"
                ? `${count} ${t("orbit.delete_for_me_desc") || "message(s) will be hidden from your view only."}`
                : `${count} ${t("orbit.delete_for_all_desc") || "message(s) will be deleted for all participants."}`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>{t("orbit.cancel") || "Cancel"}</Button>
            <Button
              variant="destructive"
              disabled={processing}
              onClick={confirmAction === "deleteMe" ? handleDeleteForMe : handleDeleteForAll}
            >
              {processing ? (t("orbit.deleting") || "Deleting…") : (t("orbit.delete") || "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Forward Dialog */}
      {showForward && currentUserId && (
        <ForwardMessageDialog
          open={showForward}
          onClose={() => { setShowForward(false); onClearSelection(); }}
          messageContent={
            count > 1
              ? `📨 ${count} ${t("orbit.forwarded_messages") || "forwarded messages"}:\n\n` + selectedMessages.map((m, i) => `[${i + 1}] ${m.content}`).join("\n\n")
              : selectedMessages[0]?.content || ""
          }
          messageId={selectedMessages[0]?.id || ""}
          userId={currentUserId}
          userEmail={userEmail || ""}
          userName={userName || "User"}
          currentContextId={currentContextId || ""}
        />
      )}
    </>
  );
}
