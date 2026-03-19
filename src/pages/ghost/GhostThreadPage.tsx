/**
 * GhostThreadPage — Individual ghost thread with E2EE messaging.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Send, Flame, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOrCreateGhostProfile,
  getThreadMessages,
  sendGhostMessage,
  subscribeGhostThread,
  burnMessage,
  checkReplay,
  generateGhostThreadKey,
  encryptGhostPayload,
  decryptGhostPayload,
  exportGhostKey,
  importGhostKey,
  type GhostTier,
} from "@/lib/ghost";
import { PageLoadingState } from "@/components/page-states";

export default function GhostThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id || !threadId) return;
    (async () => {
      try {
        const p = await getOrCreateGhostProfile(user.id);
        setProfile(p);

        // Load or create thread key
        const storedKey = sessionStorage.getItem(`ghost:thread-key:${threadId}`);
        let key: CryptoKey;
        if (storedKey) {
          key = await importGhostKey(storedKey);
        } else {
          key = await generateGhostThreadKey();
          const exported = await exportGhostKey(key);
          sessionStorage.setItem(`ghost:thread-key:${threadId}`, exported);
        }
        setThreadKey(key);

        const msgs = await getThreadMessages(threadId);
        setMessages(msgs);
      } catch (e) {
        console.error("[ghost] thread_load_failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, threadId]);

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return;
    const channel = subscribeGhostThread(threadId, (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    return () => { channel.unsubscribe(); };
  }, [threadId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !profile || !threadId || !threadKey || sending) return;
    setSending(true);
    try {
      const nonce = crypto.randomUUID();
      const aad = `${threadId}:${profile.id}:${Date.now()}`;

      if (!checkReplay(nonce, profile.tier as GhostTier)) {
        console.warn("[ghost] replay_blocked");
        return;
      }

      const { ciphertext } = await encryptGhostPayload(input, threadKey, aad);

      await sendGhostMessage({
        threadId,
        senderGhostProfileId: profile.id,
        senderAlias: profile.current_alias,
        encryptedPayload: ciphertext,
        nonce,
        aad,
        keyVersion: profile.alias_version,
        tier: profile.tier as GhostTier,
      });

      setInput("");
    } catch (e) {
      console.error("[ghost] send_failed", e);
    } finally {
      setSending(false);
    }
  }, [input, profile, threadId, threadKey, sending]);

  if (loading) return <PageLoadingState title="Loading thread..." />;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card/95 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ghost/inbox")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-foreground flex-1">Ghost Thread</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
          {profile?.tier ?? "v2"}
        </span>
        <Button variant="ghost" size="icon" onClick={() => threadId && navigate(`/ghost/call/${threadId}`)}>
          <Phone className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-8">
            <Shield className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
            End-to-end encrypted. No messages yet.
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_ghost_profile_id === profile?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                <p className="text-[10px] font-mono opacity-60 mb-0.5">{msg.sender_alias}</p>
                <p className="break-words font-mono text-xs opacity-80">{msg.encrypted_payload.slice(0, 40)}...</p>
                {msg.expires_at && (
                  <p className="text-[9px] opacity-50 mt-1">⏱ Expires {new Date(msg.expires_at).toLocaleTimeString()}</p>
                )}
                {profile?.tier === "v3" && (
                  <button
                    onClick={() => burnMessage(msg.id)}
                    className="text-[9px] mt-1 opacity-50 hover:opacity-100 flex items-center gap-0.5"
                  >
                    <Flame className="w-3 h-3" /> Burn
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border/40 p-2 flex items-center gap-2 bg-card/95 backdrop-blur-sm safe-bottom">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ghost message..."
          className="flex-1 text-sm"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
