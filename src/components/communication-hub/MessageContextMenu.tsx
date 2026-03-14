/**
 * MessageContextMenu — Full action sheet for messages.
 * Long-press on mobile, right-click on desktop.
 * Actions: Reply, Forward, Copy, Star, Edit, Delete (me/all/moderation), Select.
 */
import { useState } from "react";
import {
  Trash2, Copy, Edit3, EyeOff, Timer, ShieldAlert,
  Reply, Forward, Star, StarOff, CheckSquare, Shield,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { isActionAllowed, getMessagePolicy } from "@/lib/message-security";

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
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      if (type === "everyone" || type === "moderation") {
        const updatePayload: Record<string, any> = {
          deleted_for_all: true,
          deleted_at: new Date().toISOString(),
          deleted_by: currentUserId,
          deletion_reason: type === "moderation" ? "moderation" : "user_action",
          content: "🚫 This message was deleted",
          message_type: "system",
          attachment_url: null,
          attachment_urls: null,
          audio_url: null,
          audio_duration_seconds: null,
          translated_content: null,
        };
        const { error } = await supabase.from("messages").update(updatePayload as any).eq("id", message.msgId);
        if (error) { toast.error("Failed to delete message"); setDeleting(false); return; }
        toast.success(type === "moderation" ? "Message removed by moderation" : "Message deleted for everyone");
      } else {
        if (message.isMe) {
          await supabase.from("messages").update({
            deleted_for_sender: true, deleted_at: new Date().toISOString(),
            deleted_by: currentUserId, deletion_reason: "self_hide",
          } as any).eq("id", message.msgId);
        }
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
    toast.success("Copied");
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
    await supabase.from("messages").update({ starred: newStarred } as any).eq("id", message.msgId);
    onStarToggle?.(message.msgId, newStarred);
    toast.success(newStarred ? "Message starred" : "Message unstarred");
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
    const { error } = await supabase.from("messages").update({
      content: editText.trim(),
      edited_at: new Date().toISOString(),
      edit_history: [{ content: message.content, edited_at: new Date().toISOString() }],
    } as any).eq("id", message.msgId);
    if (error) { toast.error("Failed to edit message"); setSaving(false); return; }
    toast.success("Message edited");
    onEdited?.(message.msgId, editText.trim());
    setSaving(false);
    setEditMode(false);
    onClose();
  };

  const deleteTypeLabel = { self: "Delete for you?", everyone: "Delete for everyone?", moderation: "Remove as moderator?" };
  const deleteTypeDesc = {
    self: "This message will only be hidden from your view.",
    everyone: "This message will be removed for all participants. This cannot be undone.",
    moderation: "This message will be removed for all participants as a moderation action.",
  };

  // Action item component
  const ActionItem = ({ icon, label, onClick, color, danger }: {
    icon: React.ReactNode; label: string; onClick: () => void; color?: string; danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors active:scale-[0.98]"
      style={{
        color: danger ? "hsl(var(--hud-danger))" : color || "hsl(var(--hud-text))",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ color: danger ? "hsl(var(--hud-danger))" : color || "hsl(var(--hud-text-dim))" }}>{icon}</span>
      {label}
    </button>
  );

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
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)", border: "1px solid" }}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(false)}
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={handleSaveEdit}
              style={{ background: "hsl(var(--hud-cyan))", color: "white" }}>{saving ? "Saving..." : "Save"}</Button>
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
          <div className="py-1 max-h-[50vh] overflow-y-auto">
            <ActionItem icon={<Reply className="h-4 w-4" />} label="Reply" onClick={handleReply} />
            <ActionItem icon={<Forward className="h-4 w-4" />} label="Forward" onClick={handleForward} />

            {!message.hasAudio && (
              <ActionItem icon={<Copy className="h-4 w-4" />} label="Copy text" onClick={handleCopy} />
            )}

            <ActionItem
              icon={message.isStarred ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              label={message.isStarred ? "Unstar" : "Star"}
              onClick={handleStar}
              color="hsl(var(--hud-warning))"
            />

            {canEdit && (
              <ActionItem icon={<Edit3 className="h-4 w-4" />} label="Edit message" onClick={handleStartEdit} color="hsl(var(--hud-cyan))" />
            )}

            <ActionItem icon={<CheckSquare className="h-4 w-4" />} label="Select" onClick={handleSelect} />

            <div className="h-px mx-3 my-1" style={{ background: "hsl(var(--hud-border) / 0.1)" }} />

            <ActionItem icon={<EyeOff className="h-4 w-4" />} label="Delete for me" onClick={() => setConfirmDelete("self")} danger />

            {canDeleteForEveryone && (
              <ActionItem icon={<Trash2 className="h-4 w-4" />} label="Delete for everyone" onClick={() => setConfirmDelete("everyone")} danger />
            )}

            {canModerate && (
              <ActionItem icon={<ShieldAlert className="h-4 w-4" />} label="Remove (moderation)" onClick={() => setConfirmDelete("moderation")} danger />
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
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>Cancel</Button>
            <Button size="sm" disabled={deleting} onClick={() => confirmDelete && handleDelete(confirmDelete)}
              style={{ background: confirmDelete === "self" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-danger))", color: "white" }}>
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
  threadId, currentTTL, onChange,
}: { threadId: string; currentTTL: string; onChange: (ttl: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Timer className="h-3.5 w-3.5" style={{ color: currentTTL !== "off" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)" }} />
      <Select value={currentTTL} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[11px] w-auto gap-1 border-0" style={{
          background: currentTTL !== "off" ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-surface))",
          color: currentTTL !== "off" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
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
