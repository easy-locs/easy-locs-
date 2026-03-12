import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Inbox, MessageCircle, Send, Loader2, Image as ImageIcon, Check, CheckCheck, Star, Search } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import CallEventBubble from "@/components/communication/CallEventBubble";
import MessageActionsMenu from "@/components/communication/MessageActionsMenu";
import ReplyPreview from "@/components/communication/ReplyPreview";
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
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Fetch threads
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

      const threadMap = new Map<string, ThreadSummary>();
      for (const msg of data) {
        const key = msg.context_id!;
        if (!threadMap.has(key)) {
          threadMap.set(key, {
            context_id: key, org_id: msg.org_id,
            contact_name: msg.contact_name, last_message: msg.content,
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
      if (user) {
        await supabase.from("messages").update({ read: true })
          .eq("context_id", activeThread.context_id)
          .eq("read", false).neq("sender_id", user.id);
      }
      setMsgLoading(false);
    };
    load();
  }, [activeThread, user]);

  // Realtime
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
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `context_id=eq.${activeThread.context_id}`,
      }, (payload) => {
        const updated = payload.new as any;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
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
          ...(replyTo ? { reply_to_id: replyTo.id } : {}),
        } as any)
        .select("*")
        .single();
      if (inserted) {
        setMessages(prev => prev.some(m => m.id === (inserted as any).id) ? prev : [...prev, inserted]);
      }
      setNewMsg("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = async (file: File) => {
    if (!user || !activeThread) return;
    const err = validateMediaFile(file);
    if (err) { toast.error(err); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${activeThread.org_id}/${activeThread.context_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || path;
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      const { data: inserted } = await supabase.from("messages").insert({
        org_id: activeThread.org_id,
        sender_id: user.id,
        content: isMedia ? `📷 ${file.name}` : `📎 ${file.name}`,
        context_id: activeThread.context_id,
        context_type: "booking",
        contact_email: user.email?.toLowerCase(),
        contact_name: user.user_metadata?.full_name || user.email,
        message_type: "user",
        conversation_status: "waiting_provider",
        attachment_url: url,
      } as any).select("*").single();
      if (inserted) setMessages(prev => prev.some(m => m.id === (inserted as any).id) ? prev : [...prev, inserted]);
      toast.success("Media sent");
    } catch (e: any) {
      toast.error(e.message);
    }
    setUploading(false);
  };

  const handleMessageDeleted = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleStarToggle = (id: string, starred: boolean) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, starred } : m));
  };

  // Filter deleted messages and apply search
  const visibleMessages = messages.filter(m => {
    if ((m as any).deleted_for_sender && m.sender_id === user?.id) return false;
    if ((m as any).deleted_for_all) return false;
    if (searchQuery && !m.content?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" onClick={() => { setActiveThread(null); setMessages([]); setReplyTo(null); setShowSearch(false); setSearchQuery(""); }}>
            ← {t("nav.back") || "Back"}
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{activeThread.contact_name || "Provider"}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 bg-card rounded-xl shadow-card border border-border/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {msgLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : visibleMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{searchQuery ? "No messages match your search." : (t("client.no_messages_thread") || "No messages in this conversation yet.")}</p>
              </div>
            ) : (
              visibleMessages.map((m) => {
                const isMe = m.sender_id === user?.id;
                const isSystem = m.message_type === "system";
                const isCallEvent = isSystem && m.context_type === "call";

                if (isCallEvent) {
                  return <CallEventBubble key={m.id} content={m.content} createdAt={m.created_at} />;
                }

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

                // Find replied message
                const repliedMsg = m.reply_to_id ? messages.find(rm => rm.id === m.reply_to_id) : null;

                return (
                  <MessageActionsMenu
                    key={m.id}
                    messageId={m.id}
                    content={m.content}
                    isMe={isMe}
                    isStarred={!!(m as any).starred}
                    onReply={() => setReplyTo(m)}
                    onDeleted={() => handleMessageDeleted(m.id)}
                    onStarToggle={(starred) => handleStarToggle(m.id, starred)}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                        {/* Reply quote */}
                        {repliedMsg && (
                          <div className="mb-1.5">
                            <ReplyPreview
                              replyContent={repliedMsg.content}
                              replyAuthor={repliedMsg.sender_id === user?.id ? "You" : (repliedMsg.contact_name || "Provider")}
                              compact
                            />
                          </div>
                        )}

                        {/* Starred indicator */}
                        {(m as any).starred && (
                          <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400 inline mr-1" />
                        )}

                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                        {m.attachment_url && (
                          <ChatMediaPreview url={m.attachment_url} fileName={m.content?.replace(/^📎 |^📷 /, "")} isMe={isMe} />
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
                  </MessageActionsMenu>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="border-t border-border px-3 pt-2">
              <ReplyPreview
                replyContent={replyTo.content}
                replyAuthor={replyTo.sender_id === user?.id ? "You" : (replyTo.contact_name || "Provider")}
                onClear={() => setReplyTo(null)}
              />
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 items-center">
            <input ref={mediaInputRef} type="file" className="hidden" accept={MEDIA_ACCEPT + ",.pdf,.doc,.docx"}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ""; }} />
            <button type="button" onClick={() => mediaInputRef.current?.click()} disabled={uploading}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </button>
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
