/**
 * ForwardMessageDialog — Pick a thread to forward a message to.
 * Two-step flow: select conversation → confirm & send.
 * Queries conversation_threads for reliable thread list.
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

interface TargetThread {
  id: string;
  context_id: string;
  context_type: string;
  org_id: string;
  display_name: string;
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
        // Query conversation_threads where this user is a participant
        const { data: threadRows, error: threadErr } = await supabase
          .from("conversation_threads")
          .select("id, context_id, context_type, org_id, provider_name, listing_title, participant_ids")
          .contains("participant_ids", [userId])
          .order("last_message_at", { ascending: false })
          .limit(100);

        if (threadErr) throw threadErr;

        // Also get threads from messages where user participated (fallback)
        const { data: msgThreads } = await supabase
          .from("messages")
          .select("context_id, org_id, contact_name, thread_id")
          .or(`sender_id.eq.${userId},contact_email.eq.${userEmail}`)
          .not("context_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(200);

        const seen = new Set<string>();
        const result: TargetThread[] = [];

        // Add conversation_threads first (authoritative)
        if (threadRows) {
          for (const row of threadRows) {
            if (row.context_id && row.context_id !== currentContextId && !seen.has(row.context_id)) {
              seen.add(row.context_id);
              result.push({
                id: row.id,
                context_id: row.context_id,
                context_type: row.context_type || "direct",
                org_id: row.org_id,
                display_name: row.provider_name || row.listing_title || t("chat.conversation") || "Conversation",
              });
            }
          }
        }

        // Add from messages (if not already seen)
        if (msgThreads) {
          for (const m of msgThreads) {
            if (m.context_id && m.context_id !== currentContextId && !seen.has(m.context_id)) {
              seen.add(m.context_id);
              result.push({
                id: m.thread_id || "",
                context_id: m.context_id,
                context_type: m.context_id.startsWith("direct:") ? "direct" : "booking",
                org_id: m.org_id,
                display_name: m.contact_name || t("chat.conversation") || "Conversation",
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
  }, [open, userEmail, userId, currentContextId, t]);

  const handleForward = async () => {
    if (!selectedThread) return;
    setForwarding(true);
    setError(null);
    try {
      // Build insert payload
      const insertPayload: any = {
        org_id: selectedThread.org_id,
        sender_id: userId,
        content: messageContent,
        context_id: selectedThread.context_id,
        context_type: selectedThread.context_type,
        contact_email: userEmail,
        contact_name: userName,
        message_type: "user",
        conversation_status: "waiting_provider",
        forwarded_from: messageId,
      };

      // Include thread_id if we have it
      if (selectedThread.id) {
        insertPayload.thread_id = selectedThread.id;
      }

      const { error: insertErr } = await supabase.from("messages").insert(insertPayload);
      if (insertErr) throw insertErr;

      // Update last_message_at on target thread for proper ordering
      if (selectedThread.id) {
        await supabase
          .from("conversation_threads")
          .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", selectedThread.id)
          .then(({ error: updateErr }) => {
            if (updateErr) console.warn("[Forward] Thread update failed:", updateErr);
          });
      }

      toast.success(
        (t("chat.forwarded_to") || "Forwarded to") + " " + (selectedThread.display_name || t("chat.conversation") || "conversation")
      );
      // Platform bus: forwarded message sent
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
          {messageContent.startsWith("📨") && (
            <p className="text-[10px] text-muted-foreground/70 mt-1.5 italic">
              {t("chat.bulk_forward_note") || "Multiple messages will be sent as a single combined message"}
            </p>
          )}
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
                  <span className="text-sm font-medium text-foreground truncate">{thread.display_name}</span>
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
