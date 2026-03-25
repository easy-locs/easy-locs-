import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { useCall } from "@/components/call/CallProvider";
// debugCommsStore removed (Batch A purge)
import { Send, Mic, Plus, Check, CheckCheck, Phone, Video } from "lucide-react";
import { CallMessageBubble } from "@/components/chat/CallMessageBubble";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ConversationThread(props: { conversationId: string | null }) {
  const [draft, setDraft] = useState("");
  const orbit = useOrbitStore((s) => s.profile);
  const getMessagesByConversation = useChatStore((s) => s.getMessagesByConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const hydrateMessages = useChatStore((s) => s.hydrateMessages);
  const { startCall } = useCall();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef<string | null>(null);

  const messages = useMemo(
    () => (props.conversationId ? getMessagesByConversation(props.conversationId) : []),
    [props.conversationId, getMessagesByConversation]
  );

  useEffect(() => {
    if (!props.conversationId || hydrated.current === props.conversationId) return;
    hydrated.current = props.conversationId;
    void hydrateMessages(props.conversationId);
    // debugCommsStore removed (Batch A purge)
  }, [props.conversationId, hydrateMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!draft.trim() || !orbit?.orbitId || !props.conversationId) return;
    void sendMessage({
      conversationId: props.conversationId,
      senderOrbitId: orbit.orbitId,
      body: draft.trim(),
      type: "text",
    });
    setDraft("");
    inputRef.current?.focus();
  }, [draft, orbit?.orbitId, props.conversationId, sendMessage]);

  if (!props.conversationId) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-muted/10">
        <div className="text-center px-8">
          <div className="h-16 w-16 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
            <Send className="h-7 w-7 text-primary/40" />
          </div>
          <p className="text-sm font-medium text-foreground/60">Select a conversation</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Choose from your existing chats</p>
        </div>
      </div>
    );
  }

  const grouped: { date: string; msgs: typeof messages }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toLocaleDateString();
    if (d !== currentDate) {
      currentDate = d;
      grouped.push({ date: d, msgs: [msg] });
    } else {
      grouped[grouped.length - 1].msgs.push(msg);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.02) 0%, transparent 50%)",
        }}
      >
        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center my-3">
              <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted/40 px-3 py-0.5 rounded-full">
                {group.date === new Date().toLocaleDateString() ? "Today" : group.date}
              </span>
            </div>

            {group.msgs.map((msg) => {
              const isMine = msg.senderOrbitId === orbit?.orbitId || msg.senderOrbitId === orbit?.id;

              if (msg.type === "call") {
                return (
                  <CallMessageBubble
                    key={msg.id}
                    body={msg.body}
                    metadata={msg.metadata as Record<string, unknown> | undefined}
                    createdAt={msg.createdAt}
                    onCallBack={() => {
                      const peerOrbitId = isMine
                        ? (msg.metadata as any)?.receiverOrbitId
                        : msg.senderOrbitId;
                      if (!peerOrbitId || !props.conversationId) return;
                      void startCall({
                        orgId: peerOrbitId,
                        peerName: "Contact",
                        threadId: props.conversationId,
                        isVideo: (msg.metadata as any)?.callType === "video",
                      });
                    }}
                  />
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex mb-1 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border/30 text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="text-[13px] leading-relaxed break-words">{msg.body}</p>
                    <div className={`flex items-center justify-end gap-1 mt-0.5 ${
                      isMine ? "text-primary-foreground/60" : "text-muted-foreground/50"
                    }`}>
                      <span className="text-[10px] tabular-nums">{formatTime(msg.createdAt)}</span>
                      {isMine && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs text-muted-foreground/40">No messages yet — say hello 👋</p>
          </div>
        )}
      </div>

      <div className="flex items-end gap-1.5 px-2 py-2 border-t border-border/15 bg-card/50 backdrop-blur-sm shrink-0">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent/10 active:scale-[0.95]"
          aria-label="Attach"
        >
          <Plus className="h-5 w-5 text-foreground/50" />
        </button>

        <div className="flex-1 flex items-center rounded-full bg-muted/30 border border-border/15 px-4 min-h-[40px]">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none py-2"
          />
        </div>

        <button
          onClick={handleSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.95]"
          aria-label={draft.trim() ? "Send" : "Voice note"}
        >
          {draft.trim() ? (
            <Send className="h-4 w-4" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}