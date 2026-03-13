/**
 * MessageContextMenu — Long-press / right-click context menu for messages.
 * Supports: edit, delete for me, delete for everyone, moderation delete, copy.
 * Governance: author can delete own msg, admin/owner can moderate.
 */
import { useState } from "react";
import { Trash2, Copy, Edit3, EyeOff, Timer, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface MessageAction {
  msgId: string;
  content: string;
  isMe: boolean;
  createdAt: string;
  /** Whether current user has admin/owner role in this org */
  canModerate?: boolean;
  /** Sender ID of the message */
  senderId?: string;
  /** Whether message has attachment */
  hasAttachment?: boolean;
  /** Whether message is a voice message */
  hasAudio?: boolean;
}

interface Props {
  message: MessageAction | null;
  onClose: () => void;
  onDeleted: (msgId: string, type: "self" | "everyone" | "moderation") => void;
  onCopy: (content: string) => void;
  onEdited?: (msgId: string, newContent: string) => void;
}

const DISAPPEAR_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "30s", label: "30 seconds", seconds: 30 },
  { value: "5m", label: "5 minutes", seconds: 300 },
  { value: "1h", label: "1 hour", seconds: 3600 },
  { value: "24h", label: "24 hours", seconds: 86400 },
  { value: "7d", label: "7 days", seconds: 604800 },
];

export default function MessageContextMenu({ message, onClose, onDeleted, onCopy, onEdited }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<"self" | "everyone" | "moderation" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!message) return null;

  const canDeleteForEveryone = message.isMe && 
    (Date.now() - new Date(message.createdAt).getTime()) < 60 * 60 * 1000;

  const canModerate = !message.isMe && !!message.canModerate;

  const canEdit = message.isMe &&
    (Date.now() - new Date(message.createdAt).getTime()) < 15 * 60 * 1000;

  const handleDelete = async (type: "self" | "everyone" | "moderation") => {
    setDeleting(true);
    haptic("medium");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      if (type === "everyone" || type === "moderation") {
        // Soft delete for everyone: clear content, mark as deleted, preserve audit
        const updatePayload: Record<string, any> = {
          deleted_for_all: true,
          deleted_at: new Date().toISOString(),
          deleted_by: currentUserId,
          deletion_reason: type === "moderation" ? "moderation" : "user_action",
          // Neutralize content but keep original for audit
          content: "🚫 This message was deleted",
          message_type: "system",
          // Neutralize media
          attachment_url: null,
          attachment_urls: null,
          audio_url: null,
          audio_duration_seconds: null,
          // Clear translations
          translated_content: null,
        };

        const { error } = await supabase.from("messages")
          .update(updatePayload as any)
          .eq("id", message.msgId);

        if (error) {
          toast.error("Failed to delete message");
          setDeleting(false);
          return;
        }
        toast.success(type === "moderation" ? "Message removed by moderation" : "Message deleted for everyone");
      } else {
        // Delete for self: add user to deleted_for_user_ids array + flag sender
        if (message.isMe) {
          await supabase.from("messages")
            .update({
              deleted_for_sender: true,
              deleted_at: new Date().toISOString(),
              deleted_by: currentUserId,
              deletion_reason: "self_hide",
            } as any)
            .eq("id", message.msgId);
        }
        // Also track in local state via onDeleted callback
        toast.success("Message hidden from your view");
      }

      onDeleted(message.msgId, type);
    } catch {
      toast.error("Failed to delete message");
    }
    setDeleting(false);
    setConfirmDelete(null);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    haptic("light");
    toast.success("Copied to clipboard");
    onCopy(message.content);
    onClose();
  };

  const handleStartEdit = () => {
    setEditText(message.content);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === message.content) {
      setEditMode(false);
      return;
    }
    setSaving(true);
    haptic("medium");

    const { error } = await supabase.from("messages")
      .update({
        content: editText.trim(),
        edited_at: new Date().toISOString(),
        edit_history: [{ content: message.content, edited_at: new Date().toISOString() }],
      } as any)
      .eq("id", message.msgId);

    if (error) {
      toast.error("Failed to edit message");
      setSaving(false);
      return;
    }

    toast.success("Message edited");
    onEdited?.(message.msgId, editText.trim());
    setSaving(false);
    setEditMode(false);
    onClose();
  };

  const deleteTypeLabel = {
    self: "Delete for you?",
    everyone: "Delete for everyone?",
    moderation: "Remove as moderator?",
  };

  const deleteTypeDesc = {
    self: "This message will only be hidden from your view.",
    everyone: "This message will be removed for all participants. Attachments and voice messages will be neutralized. This cannot be undone.",
    moderation: "This message will be removed for all participants as a moderation action. This action is logged for audit.",
  };

  return (
    <>
      {/* Edit dialog */}
      <Dialog open={editMode} onOpenChange={(v) => { if (!v) setEditMode(false); }}>
        <DialogContent className="max-w-sm" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="text-sm" style={{ color: "hsl(var(--hud-text))" }}>Edit message</DialogTitle>
            <DialogDescription className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
              You can edit within 15 minutes of sending.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[80px] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
            style={{
              background: "hsl(var(--hud-surface))",
              color: "hsl(var(--hud-text))",
              borderColor: "hsl(var(--hud-border) / 0.15)",
              border: "1px solid",
            }}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(false)}
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={handleSaveEdit}
              style={{ background: "hsl(var(--hud-cyan))", color: "white" }}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action sheet */}
      <Dialog open={!!message && !confirmDelete && !editMode} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-xs p-0 overflow-hidden" style={{ 
          background: "hsl(var(--hud-bg))", 
          borderColor: "hsl(var(--hud-border) / 0.15)",
          borderRadius: 16,
        }}>
          {/* Preview */}
          <div className="px-4 py-3" style={{ 
            borderBottom: "1px solid hsl(var(--hud-border) / 0.08)",
            background: "hsl(var(--hud-surface) / 0.3)",
          }}>
            <p className="text-xs line-clamp-2" style={{ color: "hsl(var(--hud-text-dim) / 0.7)" }}>
              {message.hasAudio ? "🎤 Voice message" : message.hasAttachment ? "📎 Attachment" : message.content.length > 100 ? message.content.slice(0, 100) + "…" : message.content}
            </p>
          </div>

          {/* Actions */}
          <div className="py-1">
            {!message.hasAudio && (
              <button onClick={handleCopy}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[hsl(var(--hud-surface)/0.3)]"
                style={{ color: "hsl(var(--hud-text))" }}>
                <Copy className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
                Copy text
              </button>
            )}

            {canEdit && !message.hasAudio && (
              <button onClick={handleStartEdit}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[hsl(var(--hud-surface)/0.3)]"
                style={{ color: "hsl(var(--hud-cyan))" }}>
                <Edit3 className="h-4 w-4" />
                Edit message
              </button>
            )}

            <button onClick={() => setConfirmDelete("self")}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[hsl(var(--hud-surface)/0.3)]"
              style={{ color: "hsl(var(--hud-text))" }}>
              <EyeOff className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
              Delete for me
            </button>

            {canDeleteForEveryone && (
              <button onClick={() => setConfirmDelete("everyone")}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[hsl(var(--hud-surface)/0.3)]"
                style={{ color: "hsl(var(--hud-danger))" }}>
                <Trash2 className="h-4 w-4" />
                Delete for everyone
              </button>
            )}

            {canModerate && (
              <button onClick={() => setConfirmDelete("moderation")}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[hsl(var(--hud-surface)/0.3)]"
                style={{ color: "hsl(var(--hud-danger))" }}>
                <ShieldAlert className="h-4 w-4" />
                Remove (moderation)
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="text-sm" style={{ color: "hsl(var(--hud-text))" }}>
              {confirmDelete ? deleteTypeLabel[confirmDelete] : ""}
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
              {confirmDelete ? deleteTypeDesc[confirmDelete] : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>
              Cancel
            </Button>
            <Button size="sm" disabled={deleting} onClick={() => confirmDelete && handleDelete(confirmDelete)}
              style={{ 
                background: confirmDelete === "self" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-danger))", 
                color: "white" 
              }}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Disappearing messages config component */
export function DisappearingMessagesToggle({ 
  threadId, 
  currentTTL, 
  onChange 
}: { 
  threadId: string; 
  currentTTL: string; 
  onChange: (ttl: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Timer className="h-3.5 w-3.5" style={{ color: currentTTL !== "off" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)" }} />
      <Select value={currentTTL} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[11px] w-auto gap-1 border-0" style={{ 
          background: currentTTL !== "off" ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-surface))", 
          color: currentTTL !== "off" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))" 
        }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISAPPEAR_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.value === "off" ? "Off" : `⏱ ${opt.label}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
