import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Send, Mic, MicOff, Bot, ArrowLeft, Loader2, Building2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";

type MessageSender = "user" | "ai" | "system";
type SessionStatus = "active" | "ai_handling" | "transferring_to_shop" | "with_shop" | "resolved" | "closed";
type ActionType = "respond" | "transfer_to_shop" | "escalate" | "create_ticket" | "ask_followup";

interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  action?: { type: ActionType; reason: string };
}

interface OrbitAISupportChatProps {
  onClose?: () => void;
  initialContext?: {
    orderId?: string;
    shopId?: string;
    bookingId?: string;
  };
}

const NAVY = "hsl(220 40% 18%)";
const NAVY_DEEP = "hsl(228 28% 12%)";
const GOLD = "hsl(38 65% 56%)";
const GOLD_DIM = "hsl(38 40% 40%)";

const StatusBanner = memo(function StatusBanner({ status }: { status: SessionStatus }) {
  if (status === "active" || status === "ai_handling") return null;

  const config: Record<string, { icon: React.ReactNode; text: string; bg: string }> = {
    transferring_to_shop: {
      icon: <Building2 size={14} />,
      text: "Connecting you with the shop...",
      bg: "hsl(38 65% 56% / 0.15)",
    },
    with_shop: {
      icon: <Building2 size={14} />,
      text: "You're now connected with the shop",
      bg: "hsl(142 70% 45% / 0.15)",
    },
    resolved: {
      icon: <CheckCircle2 size={14} />,
      text: "Issue resolved",
      bg: "hsl(142 70% 45% / 0.15)",
    },
    closed: {
      icon: <CheckCircle2 size={14} />,
      text: "Session closed",
      bg: "hsl(220 10% 50% / 0.15)",
    },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        background: c.bg,
        borderRadius: 8,
        margin: "0 16px 8px",
        fontSize: 13,
        color: "hsl(0 0% 85%)",
      }}
    >
      {c.icon}
      <span>{c.text}</span>
    </div>
  );
});

const MessageBubble = memo(function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.sender === "user";
  const isSystem = msg.sender === "system";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        padding: "2px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "10px 14px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: isUser
            ? GOLD
            : isSystem
              ? "hsl(220 20% 22%)"
              : "hsl(220 30% 25%)",
          color: isUser ? NAVY_DEEP : "hsl(0 0% 90%)",
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {isSystem && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, fontSize: 11, opacity: 0.7 }}>
            <ShieldAlert size={12} />
            <span>System</span>
          </div>
        )}
        {!isUser && !isSystem && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, fontSize: 11, color: GOLD }}>
            <Bot size={12} />
            <span>Easy-Locs AI</span>
          </div>
        )}
        <span>{msg.content}</span>
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: isUser ? "right" : "left" }}>
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", padding: "2px 16px" }}>
      <div
        style={{
          padding: "12px 18px",
          borderRadius: "16px 16px 16px 4px",
          background: "hsl(220 30% 25%)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: GOLD, fontSize: 12 }}>
          <Bot size={12} />
          <span>AI is analyzing</span>
        </div>
        <Loader2 size={14} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      </div>
    </div>
  );
});

export default function OrbitAISupportChat({ onClose, initialContext }: OrbitAISupportChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("active");
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!user?.id) return;
    initSession();
  }, [user?.id]);

  const initSession = useCallback(async () => {
    if (!user?.id) return;

    const { data: existing } = await db("support_sessions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "ai_handling", "transferring_to_shop", "with_shop"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setSessionId(existing.id);
      setStatus(existing.status as SessionStatus);

      const { data: history } = await db("support_messages")
        .select("*")
        .eq("session_id", existing.id)
        .order("created_at", { ascending: true });

      if (history) {
        setMessages(
          history.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            sender: m.sender as MessageSender,
            content: m.content as string,
            timestamp: new Date(m.created_at as string),
          })),
        );
      }
      return;
    }

    const { data: session } = await db("support_sessions").insert({
      user_id: user.id,
      channel: "chat",
      status: "active",
      language: navigator.language.split("-")[0] || "en",
      order_id: initialContext?.orderId ?? null,
      shop_id: initialContext?.shopId ?? null,
      booking_id: initialContext?.bookingId ?? null,
      shop_transfer_attempts: 0,
      metadata: {},
    }).select().single();

    if (session) {
      setSessionId(session.id);

      const greeting: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "ai",
        content: "Hello! I'm Easy-Locs AI Support. How can I help you today? I can assist with orders, deliveries, payments, bookings, and more.",
        timestamp: new Date(),
      };
      setMessages([greeting]);

      await db("support_messages").insert({
        session_id: session.id,
        sender: "ai",
        content: greeting.content,
        content_type: "text",
        metadata: { type: "greeting" },
      });
    }
  }, [user?.id, initialContext]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: fn } = await db.functions.invoke("orbit-ai-support", {
        body: {
          session_id: sessionId,
          message: userMsg.content,
          language: navigator.language.split("-")[0] || "en",
          context: initialContext
            ? {
                order_id: initialContext.orderId,
                shop_id: initialContext.shopId,
                booking_id: initialContext.bookingId,
              }
            : undefined,
          conversation_history: messages.slice(-8).map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.content,
          })),
        },
      });

      if (fn?.message) {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: "ai",
          content: fn.message,
          timestamp: new Date(),
          action: fn.action,
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (fn.action?.type === "transfer_to_shop") {
          setStatus("transferring_to_shop");
        } else if (fn.action?.type === "escalate") {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: "system",
              content: "This issue has been escalated to our team. You'll receive an update soon.",
              timestamp: new Date(),
            },
          ]);
        }
      }
    } catch (err) {
      console.error("[OrbitAISupport] Failed to send:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "system",
          content: "Connection issue. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, sessionId, isLoading, messages, initialContext]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const toggleVoice = useCallback(() => {
    setIsRecording((prev) => !prev);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: NAVY_DEEP,
        color: "hsl(0 0% 90%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: NAVY,
          borderBottom: `1px solid hsl(220 20% 25%)`,
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "hsl(0 0% 70%)", cursor: "pointer", padding: 4 }}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bot size={20} style={{ color: NAVY_DEEP }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Easy-Locs Support</div>
          <div style={{ fontSize: 11, color: "hsl(142 70% 60%)" }}>
            {isLoading ? "AI is typing..." : "Online — AI-powered"}
          </div>
        </div>
      </div>

      <StatusBanner status={status} />

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      <div
        style={{
          padding: "8px 12px",
          background: NAVY,
          borderTop: `1px solid hsl(220 20% 25%)`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          onClick={toggleVoice}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: isRecording ? "hsl(0 70% 50%)" : "hsl(220 20% 28%)",
            color: "hsl(0 0% 80%)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 200ms",
          }}
        >
          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={isLoading || status === "resolved" || status === "closed"}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 20,
            border: "none",
            background: "hsl(220 20% 22%)",
            color: "hsl(0 0% 90%)",
            fontSize: 14,
            outline: "none",
          }}
        />

        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: input.trim() && !isLoading ? GOLD : "hsl(220 20% 28%)",
            color: input.trim() && !isLoading ? NAVY_DEEP : "hsl(0 0% 40%)",
            cursor: input.trim() && !isLoading ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 200ms",
          }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
