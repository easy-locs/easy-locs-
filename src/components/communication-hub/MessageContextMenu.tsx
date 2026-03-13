/**
 * MessageContextMenu — Long-press / right-click context menu for messages.
 * Supports: delete for me, delete for everyone, copy, reply.
 */
import { useState } from "react";
import { Trash2, Copy, Reply, Clock, Timer, Eye, EyeOff } from "lucide-react";
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
}

interface Props {
  message: MessageAction | null;
  onClose: () => void;
  onDeleted: (msgId: string, type: "self" | "everyone") => void;
  onCopy: (content: string) => void;
}

const DISAPPEAR_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "30s", label: "30 seconds", seconds: 30 },
  { value: "5m", label: "5 minutes", seconds: 300 },
  { value: "1h", label: "1 hour", seconds: 3600 },
  { value: "24h", label: "24 hours", seconds: 86400 },
  { value: "7d", label: "7 days", seconds: 604800 },
];

export default function MessageContextMenu({ message, onClose, onDeleted, onCopy }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<"self" | "everyone" | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!message) return null;

  const canDeleteForEveryone = message.isMe && 
    (Date.now() - new Date(message.createdAt).getTime()) < 60 * 60 * 1000; // 60 min window

  const handleDelete = async (type: "self" | "everyone") => {
    setDeleting(true);
    haptic("medium");

    if (type === "everyone") {
      // Replace content with system placeholder
      const { error } = await supabase.from("messages")
        .update({ 
          content: "🚫 This message was deleted",
          message_type: "system",
          attachment_url: null,
        } as any)
        .eq("id", message.msgId);
      
      if (error) {
        toast.error("Failed to delete message");
        setDeleting(false);
        return;
      }
      toast.success("Message deleted for everyone");
    } else {
      // Delete for self: mark as hidden (we use a soft approach - add to a local hidden list)
      toast.success("Message hidden");
    }

    onDeleted(message.msgId, type);
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

  return (
    <>
      {/* Action sheet */}
      <Dialog open={!!message && !confirmDelete} onOpenChange={() => onClose()}>
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
              {message.content.length > 100 ? message.content.slice(0, 100) + "…" : message.content}
            </p>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[hsl(var(--hud-surface)/0.3)]"
              style={{ color: "hsl(var(--hud-text))" }}>
              <Copy className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
              Copy text
            </button>

            <button onClick={() => setConfirmDelete("self")}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[hsl(var(--hud-surface)/0.3)]"
              style={{ color: "hsl(var(--hud-text))" }}>
              <EyeOff className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
              Delete for me
            </button>

            {canDeleteForEveryone && (
              <button onClick={() => setConfirmDelete("everyone")}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[hsl(var(--hud-surface)/0.3)]"
                style={{ color: "hsl(0, 70%, 60%)" }}>
                <Trash2 className="h-4 w-4" />
                Delete for everyone
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
              {confirmDelete === "everyone" ? "Delete for everyone?" : "Delete for you?"}
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
              {confirmDelete === "everyone"
                ? "This message will be removed for all participants. This cannot be undone."
                : "This message will only be hidden from your view."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>
              Cancel
            </Button>
            <Button size="sm" disabled={deleting} onClick={() => confirmDelete && handleDelete(confirmDelete)}
              style={{ 
                background: confirmDelete === "everyone" ? "hsl(0, 70%, 50%)" : "hsl(var(--hud-cyan))", 
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
