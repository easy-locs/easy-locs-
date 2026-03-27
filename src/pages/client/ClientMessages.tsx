/**
 * LEGACY ISOLATED MODULE
 * --------------------------------------------
 * This file is intentionally isolated from Orbit V2+ core.
 * Do not import Orbit core messaging services here.
 * Do not mix with canonical V2+ Orbit chain.
 * Migrate later as its own domain-specific module.
 */
import { useState, useEffect, useRef, useMemo } from "react";
import DealRoomPanel from "@/components/communication/DealRoomPanel";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Inbox, MessageCircle, Send, Loader2, Image as ImageIcon, Check, CheckCheck, Star, Search, Archive, Forward as ForwardIcon } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import CallEventBubble from "@/components/communication/CallEventBubble";
import MessageActionsMenu from "@/components/communication/MessageActionsMenu";
import SwipeableMessage from "@/components/communication/SwipeableMessage";
import ReplyPreview from "@/components/communication/ReplyPreview";
import VoiceRecorder from "@/components/communication/VoiceRecorder";
import VoiceMessageBubble from "@/components/communication/VoiceMessageBubble";
import ThreadActionsMenu from "@/components/communication/ThreadActionsMenu";
import ForwardMessageDialog from "@/components/communication/ForwardMessageDialog";
import { validateMediaFile, MEDIA_ACCEPT } from "@/lib/media-utils";
import { toast } from "sonner";

interface ThreadSummary {
  context_id: string;
  org_id: string;
  contact_name: string | null;
  last_message: string;
  last_time: string;
  unread_count: number;
  other_sender_id?: string;
}

type ThreadFilter = "all" | "starred" | "archived";

const ClientMessages = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [threadPrefs, setThreadPrefs] = useState<Record<string, { muted: boolean; archived: boolean }>>({});
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [forwardMsg, setForwardMsg] = useState<any | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Fetch threads — includes both contact_email threads AND direct threads where user is sender
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const fetchThreads = async () => {
      // Fetch messages where user is involved (by email or by sender_id for direct threads)
      const [byEmail, bySender] = await Promise.all([
        user.email ? (supabase as any)
          .from("chat_messages_v2")
          .select("conversation_id, sender_user_id, body, created_at, metadata")
          .eq("metadata->>contact_email", user.email.toLowerCase())
          .order("created_at", { ascending: false })
          .limit(500) : { data: [] },
        (supabase as any)
          .from("chat_messages_v2")
          .select("conversation_id, sender_user_id, body, created_at, metadata")
          .eq("sender_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      const allData = [...(byEmail.data || []), ...(bySender.data || [])];
      if (allData.length === 0) { setLoading(false); return; }

      const threadMap = new Map<string, ThreadSummary>();
      for (const msg of allData) {
        const key = msg.conversation_id!;
        const meta = msg.metadata || {};
        if (!threadMap.has(key)) {
          threadMap.set(key, {
            context_id: key, org_id: meta.org_id || "",
            contact_name: meta.contact_name, last_message: msg.body,
            last_time: msg.created_at,
            unread_count: 0,
            other_sender_id: msg.sender_user_id !== user.id ? msg.sender_user_id : undefined,
          });
        } else {
          const existing = threadMap.get(key)!;
          if (new Date(msg.created_at) > new Date(existing.last_time)) {
            existing.last_message = msg.body;
            existing.last_time = msg.created_at;
          }
          if (!existing.other_sender_id && msg.sender_user_id !== user.id) existing.other_sender_id = msg.sender_user_id;
        }
      }

      const sortedThreads = Array.from(threadMap.values()).sort((a, b) =>
        new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
      );
      setThreads(sortedThreads);

      // Auto-open thread from URL param ?thread=xxx
      const threadParam = searchParams.get("thread");
      if (threadParam && !activeThread) {
        const match = sortedThreads.find(t => t.context_id === threadParam);
        if (match) {
          setActiveThread(match);
          setSearchParams({}, { replace: true }); // Clean URL
        }
      }

      // Load conversation preferences
      const { data: prefs } = await supabase
        .from("conversation_preferences")
        .select("context_id, muted, archived")
        .eq("user_id", user.id);
      if (prefs) {
        const map: Record<string, { muted: boolean; archived: boolean }> = {};
        prefs.forEach((p: any) => { map[p.context_id] = { muted: p.muted, archived: p.archived }; });
        setThreadPrefs(map);
      }

      // Load blocked users
      const { data: blocked } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      if (blocked) {
        setBlockedUserIds(new Set(blocked.map((b: any) => b.blocked_id)));
      }

      setLoading(false);
    };
    fetchThreads();
  }, [user]);

  // Filtered threads
  const filteredThreads = useMemo(() => {
    let list = threads;
    // Global search
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      list = list.filter(t => t.contact_name?.toLowerCase().includes(q) || t.last_message?.toLowerCase().includes(q));
    }
    // Filter by tab
    if (threadFilter === "archived") {
      list = list.filter(t => threadPrefs[t.context_id]?.archived);
    } else if (threadFilter === "starred") {
      // Show threads that have at least one starred message — for now show all non-archived as we track at message level
      list = list.filter(t => !threadPrefs[t.context_id]?.archived);
    } else {
      // "all" — exclude archived
      list = list.filter(t => !threadPrefs[t.context_id]?.archived);
    }
    return list;
  }, [threads, globalSearch, threadFilter, threadPrefs]);

  // Load messages for active thread
  useEffect(() => {
    if (!activeThread) return;
    setMsgLoading(true);
    const load = async () => {
      const { data } = await (supabase as any).from("chat_messages_v2").select("*")
        .eq("conversation_id", activeThread.context_id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      setMsgLoading(false);
    };
    load();
  }, [activeThread, user]);

  // Realtime
  useEffect(() => {
    if (!activeThread) return;
    const channel = supabase
      .channel(`client-thread-v2-${activeThread.context_id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages_v2",
        filter: `conversation_id=eq.${activeThread.context_id}`,
      }, (payload) => {
        const incoming = payload.new as any;
        setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "chat_messages_v2",
        filter: `conversation_id=eq.${activeThread.context_id}`,
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
      const { data: inserted } = await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: activeThread.context_id,
        sender_user_id: user.id,
        sender_orbit_id: `orbit_${user.id.slice(0, 12)}`,
        type: "text",
        body: newMsg.trim(),
        metadata: {
          org_id: activeThread.org_id,
          contact_email: user.email?.toLowerCase(),
          contact_name: user.user_metadata?.full_name || user.email,
          ...(replyTo ? { reply_to_id: replyTo.id } : {}),
        },
      }).select("*").single();
      if (inserted) setMessages(prev => prev.some(m => m.id === (inserted as any).id) ? prev : [...prev, inserted]);
      setNewMsg(""); setReplyTo(null);
    } finally { setSending(false); }
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
      const { data: inserted } = await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: activeThread.context_id,
        sender_user_id: user.id,
        sender_orbit_id: `orbit_${user.id.slice(0, 12)}`,
        type: isMedia ? "image" : "file",
        body: isMedia ? `📷 ${file.name}` : `📎 ${file.name}`,
        metadata: {
          org_id: activeThread.org_id,
          contact_email: user.email?.toLowerCase(),
          contact_name: user.user_metadata?.full_name || user.email,
          attachment_url: url,
        },
      }).select("*").single();
      if (inserted) setMessages(prev => prev.some(m => m.id === (inserted as any).id) ? prev : [...prev, inserted]);
      toast.success("Media sent");
    } catch (e: any) { toast.error(e.message); }
    setUploading(false);
  };

  const handleVoiceSent = (msg: any) => {
    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
  };

  const visibleMessages = messages.filter(m => {
    const meta = m.metadata || {};
    if (meta.deleted_by?.includes(user?.id)) return false;
    if (meta.deleted_for_all) return true;
    if (searchQuery && !(m.body || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const currentPrefs = activeThread ? (threadPrefs[activeThread.context_id] || { muted: false, archived: false }) : { muted: false, archived: false };

  // ─── Thread list view ───
  if (!activeThread) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-4">{t("nav.messages") || "Messages"}</h1>
          </motion.div>

          {/* Global search */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-4">
            {(["all", "starred", "archived"] as ThreadFilter[]).map(f => (
              <button key={f} onClick={() => setThreadFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  threadFilter === f ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                {f === "all" ? "All" : f === "starred" ? "⭐ Starred" : "📦 Archived"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : filteredThreads.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{threadFilter === "archived" ? "No archived conversations" : (t("client.messages_empty") || "No messages yet")}</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {filteredThreads.map((thread, i) => (
                <motion.button key={thread.context_id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setActiveThread(thread)}
                  className="w-full bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3 hover:border-accent/30 transition-all group text-left">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{thread.contact_name || "Provider"}</p>
                      {threadPrefs[thread.context_id]?.muted && <span className="text-[10px] text-muted-foreground">🔇</span>}
                    </div>
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

  // ─── Chat view ───
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
          <ThreadActionsMenu
            userId={user!.id}
            contextId={activeThread.context_id}
            otherUserId={activeThread.other_sender_id}
            isMuted={currentPrefs.muted}
            isArchived={currentPrefs.archived}
            onPrefsChanged={(muted, archived) => {
              setThreadPrefs(prev => ({ ...prev, [activeThread.context_id]: { muted, archived } }));
            }}
          />
        </div>

        {showSearch && (
          <div className="mb-2">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus />
          </div>
        )}

        {/* Deal Room Panel — shows if a deal exists for this context */}
        {activeThread.context_id && activeThread.org_id && (
          <div className="mb-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden max-h-60">
            <DealRoomPanel
              contextType="marketplace_service"
              contextId={activeThread.context_id}
              contextTitle={activeThread.contact_name || undefined}
              targetOrgId={activeThread.org_id}
              isOrgMember={false}
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
                const isMe = m.sender_user_id === user?.id;
                const isSystem = m.type === "system";
                const meta = m.metadata || {};
                const content = m.body || "";
                const attachmentUrl = meta.attachment_url;
                const audioUrl = meta.audio_url;
                const audioDuration = meta.audio_duration_seconds || 0;
                const isCallEvent = isSystem && meta.context_type === "call";
                const isDeletedForAll = !!meta.deleted_for_all;
                const isForwarded = !!meta.forwarded_from;

                if (isCallEvent) return <CallEventBubble key={m.id} content={content} createdAt={m.created_at} />;

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
                        {content}
                        <span className="ml-2 opacity-60">{format(new Date(m.created_at), "dd/MM HH:mm")}</span>
                      </div>
                    </div>
                  );
                }

                const repliedMsg = meta.reply_to_id ? messages.find(rm => rm.id === meta.reply_to_id) : null;
                const repliedDeleted = repliedMsg && !!(repliedMsg.metadata?.deleted_for_all);
                const minutesSince = differenceInMinutes(new Date(), new Date(m.created_at));

                const bubble = (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isDeletedForAll
                        ? "bg-muted/30 border border-border/30"
                        : isMe ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      {/* Forwarded label */}
                      {isForwarded && !isDeletedForAll && (
                        <div className={`flex items-center gap-1 mb-1 text-[10px] ${isMe ? "text-accent-foreground/50" : "text-muted-foreground"}`}>
                          <ForwardIcon className="h-2.5 w-2.5" /> Forwarded
                        </div>
                      )}

                      {/* Reply quote */}
                      {repliedMsg && !isDeletedForAll && (
                        <div className="mb-1.5">
                          <ReplyPreview
                            replyContent={repliedDeleted ? "🚫 This message was deleted" : (repliedMsg.body || "")}
                            replyAuthor={repliedMsg.sender_user_id === user?.id ? "You" : (repliedMsg.metadata?.contact_name || "Provider")}
                            compact
                          />
                        </div>
                      )}

                      {/* Starred */}
                      {meta.starred && !isDeletedForAll && (
                        <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400 inline mr-1" />
                      )}

                      {/* Content */}
                      {isDeletedForAll ? (
                        <p className="text-xs italic text-muted-foreground">🚫 This message was deleted</p>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
                          {attachmentUrl && (
                            <ChatMediaPreview url={attachmentUrl} fileName={content?.replace(/^📎 |^📷 /, "")} isMe={isMe} />
                          )}
                          {audioUrl && (
                            <VoiceMessageBubble url={audioUrl} durationSeconds={audioDuration} isMe={isMe} />
                          )}
                        </>
                      )}

                      {/* Timestamp */}
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                        <p className={`text-[10px] ${isMe && !isDeletedForAll ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                          {format(new Date(m.created_at), "dd MMM HH:mm")}
                        </p>
                        {isMe && !isDeletedForAll && (
                          <span className="text-[10px]">
                            {m.read_at ? <CheckCheck className="h-3 w-3 text-accent-foreground/80" /> : <Check className="h-3 w-3 text-accent-foreground/40" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );

                if (isDeletedForAll) return <div key={m.id}>{bubble}</div>;

                const handleDeleteForMe = async () => {
                  // Soft-delete via metadata update on V2
                  await (supabase as any).from("chat_messages_v2").update({
                    metadata: { ...(m.metadata || {}), deleted_by: [...((m.metadata as any)?.deleted_by || []), user?.id] },
                  }).eq("id", m.id);
                  setMessages(prev => prev.filter(x => x.id !== m.id));
                  toast.success(t("chat.deleted_for_you") || "Deleted for you");
                };

                return (
                  <SwipeableMessage
                    key={m.id}
                    onSwipeLeft={handleDeleteForMe}
                    onSwipeRight={() => setReplyTo(m)}
                  >
                    <MessageActionsMenu
                      messageId={m.id} content={m.content} isMe={isMe}
                      isStarred={!!(m as any).starred}
                      minutesSinceSent={minutesSince}
                      onReply={() => setReplyTo(m)}
                      onForward={() => setForwardMsg(m)}
                      onDeleted={(type) => {
                        if (type === "for_all") {
                          setMessages(prev => prev.map(x => x.id === m.id ? { ...x, deleted_for_all: true, content: "🚫 This message was deleted" } : x));
                        } else {
                          setMessages(prev => prev.filter(x => x.id !== m.id));
                        }
                      }}
                      onStarToggle={(s) => setMessages(prev => prev.map(x => x.id === m.id ? { ...x, starred: s } : x))}
                    >
                      {bubble}
                    </MessageActionsMenu>
                  </SwipeableMessage>
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

            {/* Voice recorder (when no text typed) */}
            {!newMsg.trim() && activeThread && user && (
              <VoiceRecorder
                orgId={activeThread.org_id}
                contextId={activeThread.context_id}
                userId={user.id}
                userEmail={user.email?.toLowerCase() || ""}
                userName={user.user_metadata?.full_name || user.email || ""}
                onSent={handleVoiceSent}
              />
            )}

            <input type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
              placeholder={t("client.type_message") || "Type a message..."}
              className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

            {newMsg.trim() && (
              <button type="submit" disabled={sending}
                className="bg-gradient-gold text-accent-foreground p-2.5 rounded-lg hover:opacity-90 disabled:opacity-40">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Forward dialog */}
      {forwardMsg && user && (
        <ForwardMessageDialog
          open={!!forwardMsg}
          onClose={() => setForwardMsg(null)}
          messageContent={forwardMsg.content}
          messageId={forwardMsg.id}
          userId={user.id}
          userEmail={user.email?.toLowerCase() || ""}
          userName={user.user_metadata?.full_name || user.email || ""}
          currentContextId={activeThread.context_id}
        />
      )}
    </ClientLayout>
  );
};

export default ClientMessages;
