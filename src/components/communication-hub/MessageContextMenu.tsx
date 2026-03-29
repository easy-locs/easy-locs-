import { useState } from "react";
import { toast } from "sonner";
import { getAuthUser } from "@/repositories/auth-utils.repository";
import {
  Trash2, Copy, Edit3, EyeOff, Timer, ShieldAlert,
  Reply, Forward, Star, StarOff, CheckSquare, Shield,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haptic } from "@/lib/haptics";
import { isActionAllowed, getMessagePolicy } from "@/lib/message-security";
import { useI18n } from "@/lib/i18n";

import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

interface MessageAction {
  msgId: string;
  content: string;
  isMe: boolean;
  createdAt: string;
  canModerate?: boolean;
  senderId?: string;
  hasAttachment?: boolean;
  hasAudio?: boolean;
  isStarred?: boolean;
  security_level?: string;
}

interface Props {
  message: MessageAction | null;
  onClose: () => void;
  onDeleted: (msgId: string, type: "self" | "everyone" | "moderation") => void;
  onCopy: (content: string) => void;
  onEdited?: (msgId: string, newContent: string) => void;
  onReply?: (msgId: string, content: string, senderName?: string) => void;
  onForward?: (msgId: string, content: string) => void;
  onStarToggle?: (msgId: string, starred: boolean) => void;
  onEnterSelectMode?: (msgId: string) => void;
}

const DISAPPEAR_OPTIONS = [
  { value: "off", label: "Off", seconds: 0 },
  { value: "30s", label: "30 seconds", seconds: 30 },
  { value: "5m", label: "5 minutes", seconds: 300 },
  { value: "1h", label: "1 hour", seconds: 3600 },
  { value: "24h", label: "24 hours", seconds: 86400 },
  { value: "7d", label: "7 days", seconds: 604800 },
];

export default function MessageContextMenu({
  message, onClose, onDeleted, onCopy, onEdited,
  onReply, onForward, onStarToggle, onEnterSelectMode,
}: Props) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState<"self" | "everyone" | "moderation" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!message) return null;

  const policy = getMessagePolicy(message);
  const canCopy = isActionAllowed(message, "copy");
  const canForward = isActionAllowed(message, "forward");

  const canDeleteForEveryone = message.isMe &&
    (Date.now() - new Date(message.createdAt).getTime()) < 60 * 60 * 1000;

  const canModerate = !message.isMe && !!message.canModerate;

  const canEdit = message.isMe &&
    !message.hasAudio &&
    (Date.now() - new Date(message.createdAt).getTime()) < 15 * 60 * 1000;

  const handleDelete = async (type: "self" | "everyone" | "moderation") => {
    setDeleting(true);
    haptic("medium");
    try {
      const { user } = await getAuthUser();
      const currentUserId = user?.id;

      if (type === "everyone" || type === "moderation") {
        const updatePayload: Record<string, any> = {
          deleted_at: new Date().toISOString(),
          body: "🚫 This message was deleted",
          metadata: {
            deleted_by: currentUserId,
            deletion_reason: type === "moderation" ? "moderation" : "user_action",
          },
        };
        const { error } = await db.from("chat_messages_v2").update(updatePayload).eq("id", message.msgId);
        if (error) { toast.error("Failed to delete message"); setDeleting(false); return; }
        toast.success(type === "moderation"
          ? (t("orbit.message_deleted_mod") || "Message removed by moderation")
          : (t("orbit.message_deleted_all") || "Message deleted for everyone"));
      } else {
        // Delete for self — soft delete via metadata
        const { error } = await db.from("chat_messages_v2").update({
          metadata: {
            hidden_for: [currentUserId],
          },
        }).eq("id", message.msgId);
        if (error) { toast.error("Failed to hide message"); setDeleting(false); return; }
        toast.success(t("orbit.message_hidden") || "Message hidden from your view");
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
    toast.success(t("orbit.copied") || "Copied");
    onCopy(message.content);
    onClose();
  };

  const handleReply = () => {
    haptic("light");
    onReply?.(message.msgId, message.content, message.senderId);
    onClose();
  };

  const handleForward = () => {
    haptic("light");
    onForward?.(message.msgId, message.content);
    onClose();
  };

  const handleStar = async () => {
    haptic("light");
    const newStarred = !message.isStarred;
    await db.from("chat_messages_v2").update({ starred: newStarred } as any).eq("id", message.msgId);
    onStarToggle?.(message.msgId, newStarred);
    toast.success(newStarred
      ? (t("orbit.message_starred") || "Message starred")
      : (t("orbit.message_unstarred") || "Message unstarred"));
    onClose();
  };

  const handleSelect = () => {
    haptic("light");
    onEnterSelectMode?.(message.msgId);
    onClose();
  };

  const handleStartEdit = () => {
    setEditText(message.content);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === message.content) { setEditMode(false); return; }
    setSaving(true);
    haptic("medium");
    const { error } = await db.from("chat_messages_v2").update({
      body: editText.trim(),
      edited_at: new Date().toISOString(),
    }).eq("id", message.msgId);
    if (error) { toast.error("Failed to edit message"); setSaving(false); return; }
    toast.success(t("orbit.message_edited") || "Message edited");
    onEdited?.(message.msgId, editText.trim());
    setSaving(false);
    setEditMode(false);
    onClose();
  };

  const deleteTypeLabel = {
    self: t("orbit.delete_for_me_q") || "Delete for you?",
    everyone: t("orbit.delete_for_all_q") || "Delete for everyone?",
    moderation: t("orbit.remove_mod_q") || "Remove as moderator?",
  };
  const deleteTypeDesc = {
    self: t("orbit.delete_for_me_desc") || "This message will only be hidden from your view.",
    everyone: t("orbit.delete_for_all_desc") || "This message will be removed for all participants. This cannot be undone.",
    moderation: t("orbit.remove_mod_desc") || "This message will be removed for all participants as a moderation action.",
  };

  const ActionItem = ({ icon, label, onClick, color, danger }: {
    icon: React.ReactNode; label: string; onClick: () => void; color?: string; danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors active:scale-[0.98]"
      style={{
        color: danger ? "hsl(var(--destructive))" : color || "hsl(var(--foreground))",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ color: danger ? "hsl(var(--destructive))" : color || "hsl(var(--muted-foreground))" }}>{icon}</span>
      {label}
    </button>
  );

  return (
    <>
      {/* Edit dialog */}
      <Dialog open={editMode} onOpenChange={(v) => { if (!v) setEditMode(false); }}>
        <DialogContent className="max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-sm text-foreground">{t("orbit.edit_dialog_title") || "Edit message"}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("orbit.edit_dialog_desc") || "You can edit within 15 minutes of sending."}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[80px] rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>{t("orbit.cancel") || "Cancel"}</Button>
            <Button size="sm" disabled={saving} onClick={handleSaveEdit}>
              {saving ? (t("orbit.saving") || "Saving…") : (t("orbit.save") || "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action sheet */}
      <Dialog open={!!message && !confirmDelete && !editMode} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-xs p-0 overflow-hidden rounded-2xl bg-background border-border">
          {/* Preview */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {message.hasAudio
                ? `🎤 ${t("orbit.voice_message") || "Voice message"}`
                : message.hasAttachment
                  ? `📎 ${t("orbit.attachment") || "Attachment"}`
                  : message.content.length > 100 ? message.content.slice(0, 100) + "…" : message.content}
            </p>
          </div>

          {/* Actions */}
          <div className="py-1 max-h-[50vh] overflow-y-auto">
            <ActionItem icon={<Reply className="h-4 w-4" />} label={t("orbit.reply") || "Reply"} onClick={handleReply} />
            {canForward && (
              <ActionItem icon={<Forward className="h-4 w-4" />} label={t("orbit.forward") || "Forward"} onClick={handleForward} />
            )}
            {!message.hasAudio && canCopy && (
              <ActionItem icon={<Copy className="h-4 w-4" />} label={t("orbit.copy_text") || "Copy text"} onClick={handleCopy} />
            )}

            {policy.level !== "normal" && (
              <div className="px-4 py-2 flex items-center gap-2 text-accent">
                <Shield className="h-3.5 w-3.5" />
                <span className="text-[11px]">{policy.emoji} {policy.label}</span>
              </div>
            )}

            <ActionItem
              icon={message.isStarred ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              label={message.isStarred ? (t("orbit.unstar") || "Unstar") : (t("orbit.star") || "Star")}
              onClick={handleStar}
            />

            {canEdit && (
              <ActionItem icon={<Edit3 className="h-4 w-4" />} label={t("orbit.edit_message") || "Edit message"} onClick={handleStartEdit} />
            )}

            <ActionItem icon={<CheckSquare className="h-4 w-4" />} label={t("orbit.select") || "Select"} onClick={handleSelect} />

            <div className="h-px mx-3 my-1 bg-border" />

            <ActionItem icon={<EyeOff className="h-4 w-4" />} label={t("orbit.delete_for_me") || "Delete for me"} onClick={() => setConfirmDelete("self")} danger />

            {canDeleteForEveryone && (
              <ActionItem icon={<Trash2 className="h-4 w-4" />} label={t("orbit.delete_for_all") || "Delete for everyone"} onClick={() => setConfirmDelete("everyone")} danger />
            )}

            {canModerate && (
              <ActionItem icon={<ShieldAlert className="h-4 w-4" />} label={t("orbit.remove_moderation") || "Remove (moderation)"} onClick={() => setConfirmDelete("moderation")} danger />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-xs bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-sm text-foreground">
              {confirmDelete ? deleteTypeLabel[confirmDelete] : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {confirmDelete ? deleteTypeDesc[confirmDelete] : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
              {t("orbit.cancel") || "Cancel"}
            </Button>
            <Button size="sm" variant={confirmDelete === "self" ? "default" : "destructive"} disabled={deleting} onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              {deleting ? (t("orbit.deleting") || "Deleting…") : (t("orbit.delete") || "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Disappearing messages config component */
export function DisappearingMessagesToggle({
  threadId, currentTTL, onChange,
}: { threadId: string; currentTTL: string; onChange: (ttl: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={currentTTL} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[11px] w-auto gap-1 border-0 bg-muted text-muted-foreground">
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
