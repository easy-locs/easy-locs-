/**
 * LEGACY ISOLATED MODULE
 * --------------------------------------------
 * This file is intentionally isolated from Orbit V2+ core.
 * Do not import Orbit core messaging services here.
 * Do not mix with canonical V2+ Orbit chain.
 * Migrate later as its own domain-specific module.
 *
 * InMissionChat — Real-time chat between seller and driver during active delivery.
 * PASS82-U: In-Mission Chat
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  jobId: string;
  sellerId: string;
  driverId: string;
  onClose?: () => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function InMissionChat({ jobId, sellerId, driverId, onClose, className }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const contextId = `delivery_chat_${jobId}`;
  const isDriver = user?.id === driverId;
  const isSeller = user?.id === sellerId;

  // Load messages
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("chat_messages_v2")
        .select("id, sender_user_id, body, created_at")
        .eq("conversation_id", contextId)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages((data || []).map((m: any) => ({ id: m.id, sender_id: m.sender_user_id, content: m.body, created_at: m.created_at })) as ChatMessage[]);
    } catch (err) {
      console.error("[mission-chat]", err);
    } finally {
      setLoading(false);
    }
  }, [contextId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`mission-chat-${jobId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages_v2",
        filter: `conversation_id=eq.${contextId}`,
      }, (payload) => {
        const msg = payload.new as any;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, { id: msg.id, sender_id: msg.sender_user_id, content: msg.body, created_at: msg.created_at }];
        });
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [jobId, contextId]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    try {
      // We need merchant_id - fetch from the job
      const { data: jobData } = await (supabase as any)
        .from("mobility_jobs")
        .select("merchant_id")
        .eq("id", jobId)
        .maybeSingle();

      const { error } = await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: contextId,
        sender_user_id: user.id,
        sender_orbit_id: `orbit_${user.id.slice(0, 12)}`,
        type: "text",
        body: input.trim(),
      });
      if (error) throw error;
      setInput("");
    } catch (err: any) {
      toast.error("Erreur envoi");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`rounded-xl overflow-hidden flex flex-col ${className || ""}`}
      style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)", height: 300 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
          <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
            Chat mission
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full"
            style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
            En direct
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-5 w-5 mx-auto mb-1" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Commencez la conversation</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] rounded-xl px-3 py-1.5"
                  style={{
                    background: isMe ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-border) / 0.08)",
                  }}>
                  <p className="text-[10px] font-medium mb-0.5"
                    style={{ color: isMe ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)" }}>
                    {isMe ? "Vous" : msg.sender_id === driverId ? "🚗 Livreur" : "📦 Vendeur"}
                  </p>
                  <p className="text-[11px]" style={{ color: "hsl(var(--hud-text))" }}>{msg.content}</p>
                  <p className="text-[7px] mt-0.5 text-right" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                    {new Date(msg.created_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Message..." className="h-8 text-[11px] flex-1"
          style={{ background: "hsl(var(--hud-border) / 0.04)" }} />
        <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()}
          className="h-8 w-8 p-0" style={{ background: "hsl(var(--hud-cyan))", color: "#fff" }}>
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
