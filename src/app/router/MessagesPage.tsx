import { useEffect, useMemo, useState, useCallback } from "react";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import { getConversationMessages } from "@/lib/chat/conversationService";
import { sendTextMessage } from "@/lib/chat/messageService";
import { AddContactByEmail } from "@/components/chat/AddContactByEmail";
import { CallButton } from "@/components/call/CallButton";
import { IncomingCallModal } from "@/components/call/IncomingCallModal";
import { useCallRealtime } from "@/hooks/useCallRealtime";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { ArrowLeft, Send } from "lucide-react";
import type { ConversationRow, ChatMessageRow } from "@/lib/types/comms";

type OrbitProfile = {
  orbitId: string;
  email: string | null;
  displayName: string | null;
};

type PeerInfo = {
  orbit_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function MessagesPage() {
  const [myOrbit, setMyOrbit] = useState<OrbitProfile | null>(null);
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [text, setText] = useState("");

  useCallRealtime();

  useEffect(() => {
    void (async () => {
      const profile = await ensureOrbitProfile();
      if (profile) {
        setMyOrbit({
          orbitId: (profile as any).orbit_id,
          email: (profile as any).email ?? null,
          displayName: (profile as any).display_name ?? null,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    void (async () => {
      const rows = await getConversationMessages(conversation.id);
      setMessages(rows);
    })();
  }, [conversation?.id]);

  const handleRealtimeMessage = useCallback((row: any) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === row.id)) return prev;
      return [...prev, row];
    });
  }, []);

  useConversationRealtime({
    conversationId: conversation?.id ?? null,
    onMessage: handleRealtimeMessage,
  });

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [messages]
  );

  const handleSend = async () => {
    if (!conversation || !peer || !myOrbit || !text.trim()) return;

    const msg = await sendTextMessage({
      conversationId: conversation.id,
      senderOrbitId: myOrbit.orbitId,
      receiverOrbitId: peer.orbit_id,
      body: text,
    });

    setMessages((prev) => {
      if (prev.some((x) => x.id === msg.id)) return prev;
      return [...prev, msg];
    });
    setText("");
  };

  const handleBack = useCallback(() => {
    setConversation(null);
    setPeer(null);
    setMessages([]);
  }, []);

  const showThread = !!conversation;

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <IncomingCallModal />

      {!showThread ? (
        <>
          <div className="shrink-0 px-4 pt-4 pb-2">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
            <AddContactByEmail
              onConversationReady={(conv, foundPeer) => {
                setConversation(conv);
                setPeer(foundPeer);
                setMessages([]);
              }}
            />
          </div>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-border/30 bg-card">
            <button
              onClick={handleBack}
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-accent/10 active:scale-[0.95] transition-all"
            >
              <ArrowLeft className="h-5 w-5 text-foreground/70" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {peer?.display_name ?? peer?.email ?? "Chat"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {peer?.orbit_id}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <CallButton orbitId={peer!.orbit_id} type="audio" />
              <CallButton orbitId={peer!.orbit_id} type="video" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
            {sortedMessages.map((msg) => {
              const mine = msg.sender_orbit_id === myOrbit?.orbitId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-t border-border/30 bg-card">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSend()}
              className="flex-1 rounded-full border border-border/30 bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Message…"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!text.trim()}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-[0.95] transition-transform disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
