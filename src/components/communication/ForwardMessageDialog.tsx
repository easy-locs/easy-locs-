/**
 * ForwardMessageDialog — Pick a thread to forward a message to.
 * Two-step flow: select conversation → confirm & send.
 */
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2, Forward, Send, Check } from "lucide-react";
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
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  useEffect(() => {
    if (!open) { setSelectedThread(null); return; }
    setLoading(true);

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

  const handleForward = async () => {
    if (!selectedThread) return;
    setForwarding(true);
    try {
      const contextType = selectedThread.context_id.startsWith("direct:") ? "direct" : "booking";
      const { error } = await supabase.from("messages").insert({
        org_id: selectedThread.org_id,
        sender_id: userId,
        content: messageContent,
        context_id: selectedThread.context_id,
        context_type: contextType,
        contact_email: userEmail,
        contact_name: userName,
        message_type: "user",
        conversation_status: "waiting_provider",
        forwarded_from: messageId,
      } as any);
      if (error) throw error;
      toast.success(`Forwarded to ${selectedThread.contact_name || "conversation"}`);
      onClose();
    } catch (e: any) {
      console.error("[Forward] Insert failed:", e);
      toast.error("Failed to forward message");
    }
    setForwarding(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Forward className="h-4 w-4" /> Forward message
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {selectedThread ? "Confirm forwarding to this conversation" : "Select a conversation to forward to"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Message preview */}
        <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground mb-0.5">Message:</p>
          <p className="text-sm line-clamp-3">{messageContent}</p>
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : threads.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No other conversations</p>
          ) : (
            threads.map(t => {
              const isSelected = selectedThread?.context_id === t.context_id;
              return (
                <button
                  key={t.context_id}
                  onClick={() => setSelectedThread(isSelected ? null : t)}
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
                  <span className="text-sm font-medium text-foreground truncate">{t.contact_name || "Conversation"}</span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={forwarding}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={!selectedThread || forwarding}
            className="gap-2"
          >
            {forwarding ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="h-4 w-4" /> Forward</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
