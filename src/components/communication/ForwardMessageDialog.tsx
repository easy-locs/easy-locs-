/**
 * ForwardMessageDialog — Pick a thread to forward a message to.
 */
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Loader2, Forward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface Thread {
  context_id: string;
  org_id: string;
  contact_name: string | null;
}

export default function ForwardMessageDialog({
  open, onClose, messageContent, messageId, userId, userEmail, userName, currentContextId,
}: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    // Fetch threads where user is contact_email OR sender_id (covers direct threads)
    Promise.all([
      supabase
        .from("messages")
        .select("context_id, org_id, contact_name")
        .eq("contact_email", userEmail)
        .not("context_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("messages")
        .select("context_id, org_id, contact_name")
        .eq("sender_id", userId)
        .not("context_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]).then(([byEmail, bySender]) => {
      const allData = [...(byEmail.data || []), ...(bySender.data || [])];
      const seen = new Set<string>();
      const unique: Thread[] = [];
      for (const m of allData) {
        if (m.context_id && !seen.has(m.context_id) && m.context_id !== currentContextId) {
          seen.add(m.context_id);
          unique.push({ context_id: m.context_id, org_id: m.org_id, contact_name: m.contact_name });
        }
      }
      setThreads(unique);
      setLoading(false);
    });
  }, [open, userEmail, userId, currentContextId]);

  const handleForward = async (thread: Thread) => {
    setForwarding(true);
    await supabase.from("messages").insert({
      org_id: thread.org_id,
      sender_id: userId,
      content: messageContent,
      context_id: thread.context_id,
      context_type: "booking",
      contact_email: userEmail,
      contact_name: userName,
      message_type: "user",
      conversation_status: "waiting_provider",
      forwarded_from: messageId,
    } as any);
    setForwarding(false);
    toast.success(`Forwarded to ${thread.contact_name || "conversation"}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Forward className="h-4 w-4" /> Forward message
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : threads.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No other conversations</p>
          ) : (
            threads.map(t => (
              <button
                key={t.context_id}
                onClick={() => handleForward(t)}
                disabled={forwarding}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-medium text-foreground truncate">{t.contact_name || "Conversation"}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
