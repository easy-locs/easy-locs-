/**
 * ForwardMessageDialog — V2+ canonical forward dialog.
 * Backward-compatible with both old (messageContent/messageId) and new (message/threads) APIs.
 */
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2, Forward, Send, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { platformBus } from "@/lib/shared/platform-bus";

const db = supabase as any;

interface TargetThread {
  id: string;
  context_id: string;
  context_type: string;
  org_id: string;
  display_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  messageContent: string;
  messageId: string;
  userId: string;
  userEmail: string;
  userName: string;
  currentContextId: string;
}

export default function ForwardMessageDialog({
  open, onClose, messageContent, messageId, userId, userEmail, userName, currentContextId,
}: Props) {
  const { t } = useI18n();
  const [threads, setThreads] = useState<TargetThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [selectedThread, setSelectedThread] = useState<TargetThread | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setSelectedThread(null); setError(null); return; }
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: convRows, error: convErr } = await db
          .from("conversations_v2")
          .select("id, type, title, participants, metadata, last_message_at")
          .order("last_message_at", { ascending: false })
          .limit(100);

        if (convErr) throw convErr;

        const result: TargetThread[] = [];
        if (convRows) {
          for (const row of convRows) {
            if (row.id !== currentContextId) {
              const participants = Array.isArray(row.participants) ? row.participants : [];
              const peerName = participants.find((p: any) => p.userId !== userId)?.displayName;
              result.push({
                id: row.id,
                context_id: row.id,
                context_type: row.type || "direct",
                org_id: (row.metadata as any)?.org_id || "",
                display_name: row.title || peerName || t("chat.conversation") || "Conversation",
              });
            }
          }
        }

        setThreads(result);
      } catch (e: any) {
        console.error("[Forward] Load threads failed:", e);
        setError(e?.message || "Failed to load conversations");
      }
      setLoading(false);
    })();
  }, [open, userId, currentContextId, t]);

  const handleForward = async () => {
    if (!selectedThread) return;
    setForwarding(true);
    setError(null);
    try {
      const { error: insertErr } = await db.from("chat_messages_v2").insert({
        conversation_id: selectedThread.context_id,
        sender_user_id: userId,
        sender_orbit_id: `orbit_${userId.slice(0, 12)}`,
        type: "text",
        body: messageContent,
        metadata: { forwarded_from: messageId },
      });
      if (insertErr) throw insertErr;

      await db
        .from("conversations_v2")
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", selectedThread.context_id);

      toast.success(
        (t("chat.forwarded_to") || "Forwarded to") + " " + (selectedThread.display_name || t("chat.conversation") || "conversation")
      );
      platformBus.emit("orbit:message_sent", {
        threadId: selectedThread.id,
        contextId: selectedThread.context_id,
        type: "forward",
        originalMessageId: messageId,
      }, "orbit", { userId });
      onClose();
    } catch (e: any) {
      console.error("[Forward] Insert failed:", e);
      setError(e?.message || t("chat.forward_failed") || "Failed to forward message");
      toast.error(t("chat.forward_failed") || "Failed to forward message");
    }
    setForwarding(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Forward className="h-4 w-4" /> {t("chat.forward_message") || "Forward message"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {selectedThread
              ? (t("chat.confirm_forward") || "Confirm forwarding to this conversation")
              : (t("chat.select_conversation") || "Select a conversation to forward to")}
          </DialogDescription>
        </DialogHeader>

        {/* Message preview */}
        <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground mb-0.5">
            {messageContent.startsWith("📨")
              ? (t("chat.combined_message") || "Combined message:")
              : (t("chat.message_label") || "Message:")}
          </p>
          <p className="text-sm line-clamp-4 whitespace-pre-line">{messageContent}</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : threads.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">{t("chat.no_conversations") || "No other conversations"}</p>
          ) : (
            threads.map(thread => {
              const isSelected = selectedThread?.context_id === thread.context_id;
              return (
                <button
                  key={thread.context_id}
                  onClick={() => setSelectedThread(isSelected ? null : thread)}
                  disabled={forwarding}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left disabled:opacity-50 ${
                    isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-primary/20" : "bg-accent/10"
                  }`}>
                    {isSelected ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-accent" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground min-w-0 break-words leading-snug">{thread.display_name}</span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={forwarding}>
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            onClick={handleForward}
            disabled={!selectedThread || forwarding}
            className="gap-2"
          >
            {forwarding ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("common.sending") || "Sending..."}</>
            ) : (
              <><Send className="h-4 w-4" /> {t("chat.forward") || "Forward"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
