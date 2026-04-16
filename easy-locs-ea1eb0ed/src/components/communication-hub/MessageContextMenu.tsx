import { useState } from "react";
import { toast } from "sonner";
import { getAuthUser } from "@/repositories/auth-utils.repository";
import {
  deleteMessageForEveryone, moderateMessage, hideMessageForUser,
  starMessage, editMessageContent, addMessageReaction,
} from "@/repositories/communication.repository";
import {
  Trash2, Copy, Edit3, EyeOff, Timer, ShieldAlert,
  Reply, Forward, Star, StarOff, CheckSquare, Shield, Plus,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haptic } from "@/lib/haptics";
import { isActionAllowed, getMessagePolicy } from "@/lib/message-security";
import { useI18n } from "@/lib/i18n";

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

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥"];
const EXTENDED_REACTIONS = [
  "👍", "👎", "❤️", "🧡", "💛", "💚", "💙", "💜",
  "😂", "😅", "🤣", "😊", "😍", "🥰", "😘", "😎",
  "😮", "😯", "😲", "🤯", "😱", "😰", "😢", "😭",
  "🙏", "🔥", "✨", "🎉", "🥳", "💯", "👏", "🤝",
  "💪", "🤔", "🤗", "🫡", "🫶", "✅", "❌", "⭐",
];

const DISAPPEAR_OPTIONS = [
  { value: "off", labelKey: "orbit.disappear_off", seconds: 0 },
  { value: "30s", labelKey: "orbit.disappear_30s", seconds: 30 },
  { value: "5m", labelKey: "orbit.disappear_5m", seconds: 300 },
  { value: "1h", labelKey: "orbit.disappear_1h", seconds: 3600 },
  { value: "24h", labelKey: "orbit.disappear_24h", seconds: 86400 },
  { value: "7d", labelKey: "orbit.disappear_7d", seconds: 604800 },
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
  const [showFullPicker, setShowFullPicker] = useState(false);

  const sendReaction = async (emoji: string) => {
    haptic("light");
    try {
      const { user: authUser } = await getAuthUser();
      if (authUser?.id && message) {
        await addMessageReaction(message.msgId, authUser.id, emoji);
        toast.success(`${emoji} ${t("orbit.reaction_sent")}`);
      } else {
        toast.error(t("orbit.reaction_failed"));
      }
    } catch {
      toast.error(t("orbit.reaction_failed"));
    }
    setShowFullPicker(false);
    onClose();
  };

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

      if (type === "everyone") {
        await deleteMessageForEveryone(message.msgId, currentUserId || "");
        toast.success(t("orbit.message_deleted_all"));
      } else if (type === "moderation") {
        await moderateMessage(message.msgId, currentUserId || "");
        toast.success(t("orbit.message_deleted_mod"));
      } else {
        await hideMessageForUser(message.msgId, currentUserId || "");
        toast.success(t("orbit.message_hidden"));
      }
      onDeleted(message.msgId, type);
    } catch {
      toast.error(t("orbit.delete_message_failed"));
    }
    setDeleting(false);
    setConfirmDelete(null);
    onClose();
  };

  const handleCopy = async () => {
    const { copyToClipboard } = await import("@/lib/clipboard");
    const result = await copyToClipboard(message.content || "");
    haptic("light");
    if (result.ok) {
      toast.success(t("orbit.copied"));
    }
    onCopy(message.content || "");
    onClose();
  };

  const handleReply = () => {
    haptic("light");
    onReply?.(message.msgId, message.content || "", message.senderId);
    onClose();
  };

  const handleForward = () => {
    haptic("light");
    onForward?.(message.msgId, message.content || "");
    onClose();
  };

  const handleStar = async () => {
    haptic("light");
    const newStarred = !message.isStarred;
    await starMessage(message.msgId, newStarred);
    onStarToggle?.(message.msgId, newStarred);
    toast.success(newStarred
      ? (t("orbit.message_starred"))
      : (t("orbit.message_unstarred")));
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
    try {
      await editMessageContent(message.msgId, editText.trim());
      toast.success(t("orbit.message_edited"));
      onEdited?.(message.msgId, editText.trim());
    } catch {
      toast.error(t("orbit.edit_message_failed"));
    }
    setSaving(false);
    setEditMode(false);
    onClose();
  };

  const deleteTypeLabel = {
    self: t("orbit.delete_for_me_q"),
    everyone: t("orbit.delete_for_all_q"),
    moderation: t("orbit.remove_mod_q"),
  };
  const deleteTypeDesc = {
    self: t("orbit.delete_for_me_desc"),
    everyone: t("orbit.delete_for_all_desc"),
    moderation: t("orbit.remove_mod_desc"),
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
            <DialogTitle className="text-sm text-foreground">{t("orbit.edit_dialog_title")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("orbit.edit_dialog_desc")}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[80px] rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>{t("orbit.cancel")}</Button>
            <Button size="sm" disabled={saving} onClick={handleSaveEdit}>
              {saving ? (t("orbit.saving")) : (t("orbit.save"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action sheet */}
      <Dialog open={!!message && !confirmDelete && !editMode} onOpenChange={() => { setShowFullPicker(false); onClose(); }}>
        <DialogContent className="max-w-xs p-0 overflow-hidden rounded-2xl bg-background border-border">
          {/* Quick Emoji Reactions Bar */}
          <div className="flex items-center justify-center gap-1.5 px-3 py-3 border-b border-border/50" style={{ background: "hsl(var(--card) / 0.6)" }}>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[1.25rem] transition-transform active:scale-110 hover:bg-muted/50"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => { haptic("light"); setShowFullPicker(!showFullPicker); }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-110"
              style={{ background: showFullPicker ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted))" }}
            >
              <Plus className="h-4 w-4" style={{ color: showFullPicker ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
            </button>
          </div>

          {showFullPicker && (
            <div className="px-3 py-2 border-b border-border/30 max-h-[200px] overflow-y-auto" style={{ background: "hsl(var(--card) / 0.3)" }}>
              <div className="grid grid-cols-8 gap-0.5">
                {EXTENDED_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[1.125rem] transition-transform active:scale-110 hover:bg-muted/50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="px-4 py-2.5 border-b border-border/30 bg-muted/20">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {message.hasAudio
                ? `🎤 ${t("orbit.voice_message")}`
                : message.hasAttachment
                  ? `📎 ${t("orbit.attachment")}`
                  : (message.content || "").length > 100 ? (message.content || "").slice(0, 100) + "…" : (message.content || "")}
            </p>
          </div>

          {/* Actions */}
          <div className="py-1 max-h-[50vh] overflow-y-auto">
            <ActionItem icon={<Reply className="h-4 w-4" />} label={t("orbit.reply")} onClick={handleReply} />
            {canForward && (
              <ActionItem icon={<Forward className="h-4 w-4" />} label={t("orbit.forward")} onClick={handleForward} />
            )}
            {!message.hasAudio && canCopy && (
              <ActionItem icon={<Copy className="h-4 w-4" />} label={t("orbit.copy_text")} onClick={handleCopy} />
            )}

            {policy.level !== "normal" && (
              <div className="px-4 py-2 flex items-center gap-2 text-accent">
                <Shield className="h-3.5 w-3.5" />
                <span className="text-[0.6875rem]">{policy.emoji} {policy.label}</span>
              </div>
            )}

            <ActionItem
              icon={message.isStarred ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              label={message.isStarred ? (t("orbit.unstar")) : (t("orbit.star"))}
              onClick={handleStar}
            />

            {canEdit && (
              <ActionItem icon={<Edit3 className="h-4 w-4" />} label={t("orbit.edit_message")} onClick={handleStartEdit} />
            )}

            <ActionItem icon={<CheckSquare className="h-4 w-4" />} label={t("orbit.select")} onClick={handleSelect} />

            <div className="h-px mx-3 my-1 bg-border" />

            <ActionItem icon={<EyeOff className="h-4 w-4" />} label={t("orbit.delete_for_me")} onClick={() => setConfirmDelete("self")} danger />

            {canDeleteForEveryone && (
              <ActionItem icon={<Trash2 className="h-4 w-4" />} label={t("orbit.delete_for_all")} onClick={() => setConfirmDelete("everyone")} danger />
            )}

            {canModerate && (
              <ActionItem icon={<ShieldAlert className="h-4 w-4" />} label={t("orbit.remove_moderation")} onClick={() => setConfirmDelete("moderation")} danger />
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
              {t("orbit.cancel")}
            </Button>
            <Button size="sm" variant={confirmDelete === "self" ? "default" : "destructive"} disabled={deleting} onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              {deleting ? (t("orbit.deleting")) : (t("orbit.delete"))}
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
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={currentTTL} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[0.6875rem] w-auto gap-1 border-0 bg-muted text-muted-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISAPPEAR_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.value === "off" ? t(opt.labelKey) : `⏱ ${t(opt.labelKey)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
