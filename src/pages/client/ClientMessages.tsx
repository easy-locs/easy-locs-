import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Inbox, MessageCircle, Send, Loader2, Paperclip, Check, CheckCheck, Image as ImageIcon } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import { validateMediaFile, MEDIA_ACCEPT } from "@/lib/media-utils";
import { toast } from "sonner";

interface ThreadSummary {
  context_id: string;
  org_id: string;
  contact_name: string | null;
  last_message: string;
  last_time: string;
  unread_count: number;
}

const ClientMessages = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch threads grouped by context_id where contact_email = user email
  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    const fetchThreads = async () => {
      const { data } = await supabase
        .from("messages")
        .select("context_id, org_id, contact_name, content, created_at, read, sender_id")
        .eq("contact_email", user.email.toLowerCase())
        .not("context_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!data || data.length === 0) { setLoading(false); return; }

      // Group by context_id, take latest message per thread
      const threadMap = new Map<string, ThreadSummary>();
      for (const msg of data) {
        const key = msg.context_id!;
        if (!threadMap.has(key)) {
          threadMap.set(key, {
            context_id: key,
            org_id: msg.org_id,
            contact_name: msg.contact_name,
            last_message: msg.content,
            last_time: msg.created_at,
            unread_count: (!msg.read && msg.sender_id !== user.id) ? 1 : 0,
          });
        } else {
          const existing = threadMap.get(key)!;
          if (!msg.read && msg.sender_id !== user.id) existing.unread_count++;
        }
      }

      setThreads(Array.from(threadMap.values()).sort((a, b) =>
        new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
      ));
      setLoading(false);
    };
    fetchThreads();
  }, [user]);

  // Load messages for active thread
  useEffect(() => {
    if (!activeThread) return;
    setMsgLoading(true);
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("context_id", activeThread.context_id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      // Mark as read
      if (user) {
        await supabase
          .from("messages")
          .update({ read: true })
          .eq("context_id", activeThread.context_id)
          .eq("read", false)
          .neq("sender_id", user.id);
      }
      setMsgLoading(false);
    };
    load();
  }, [activeThread, user]);

  // Realtime for active thread
  useEffect(() => {
    if (!activeThread) return;
    const channel = supabase
      .channel(`client-thread-${activeThread.context_id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `context_id=eq.${activeThread.context_id}`,
      }, (payload) => {
        const incoming = payload.new as any;
        setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
        if (incoming.sender_id !== user?.id) {
          supabase.from("messages").update({ read: true }).eq("id", incoming.id).then(() => {});
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeThread, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !user || !activeThread) return;
    setSending(true);
    try {
      const { data: inserted } = await supabase
        .from("messages")
        .insert({
          org_id: activeThread.org_id,
          sender_id: user.id,
          content: newMsg.trim(),
          context_id: activeThread.context_id,
          context_type: "booking",
          contact_email: user.email?.toLowerCase(),
          contact_name: user.user_metadata?.full_name || user.email,
          message_type: "user",
          conversation_status: "waiting_provider",
        } as any)
        .select("*")
        .single();
      if (inserted) {
        setMessages(prev => prev.some(m => m.id === (inserted as any).id) ? prev : [...prev, inserted]);
      }
      setNewMsg("");
    } finally {
      setSending(false);
    }
  };

  // Thread list view
  if (!activeThread) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.messages") || "Messages"}</h1>
          </motion.div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : threads.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("client.messages_empty") || "No messages yet"}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("client.messages_empty_desc") || "Your conversations with providers will appear here."}</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread, i) => (
                <motion.button
                  key={thread.context_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setActiveThread(thread)}
                  className="w-full bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3 hover:border-accent/30 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{thread.contact_name || "Provider"}</p>
                    <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(thread.last_time), { addSuffix: true })}</p>
                    {thread.unread_count > 0 && (
                      <div className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center ml-auto mt-1">
                        {thread.unread_count}
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </ClientLayout>
    );
  }

  // Chat view
  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" onClick={() => { setActiveThread(null); setMessages([]); }}>
            ← {t("nav.back") || "Back"}
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{activeThread.contact_name || "Provider"}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-card rounded-xl shadow-card border border-border/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t("client.no_messages_thread") || "No messages in this conversation yet."}</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                const isSystem = m.message_type === "system";
                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
                        {m.content}
                        <span className="ml-2 opacity-60">{format(new Date(m.created_at), "dd/MM HH:mm")}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      {m.attachment_url && (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 mt-2 text-xs underline ${isMe ? "text-accent-foreground/80" : "text-accent"}`}>
                          <Paperclip className="h-3 w-3" /> Attachment
                        </a>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                        <p className={`text-[10px] ${isMe ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                          {format(new Date(m.created_at), "dd MMM HH:mm")}
                        </p>
                        {isMe && (
                          <span className="text-[10px]">
                            {m.read ? <CheckCheck className="h-3 w-3 text-accent-foreground/80" /> : <Check className="h-3 w-3 text-accent-foreground/40" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 items-center">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder={t("client.type_message") || "Type a message..."}
              className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" disabled={sending || !newMsg.trim()} className="bg-gradient-gold text-accent-foreground p-2.5 rounded-lg hover:opacity-90 disabled:opacity-40">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientMessages;
