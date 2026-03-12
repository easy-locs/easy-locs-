import { useState, useRef, useEffect } from "react";
import { BrainCircuit, Send, X, Loader2, Sparkles, User, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const FloatingAIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, session } = useAuth();
  const { locale } = useI18n();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          locale,
          task: "chat",
          stream: true,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limit exceeded. Please try again later.");
        if (resp.status === 402) toast.error("AI credits depleted.");
        throw new Error("Stream failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial */ }
        }
      }

      if (!assistantContent) {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, no response was generated." }]);
      }
    } catch {
      if (!assistantContent) {
        setMessages(prev => [...prev, { role: "assistant", content: "An error occurred. Please try again." }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "📊 Analyze my portfolio",
    "⚖️ Legal advice",
    "✍️ Draft a message",
    "💡 Optimization tips",
  ];

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="floating-ai-btn fixed bottom-[6.5rem] lg:bottom-6 end-4 z-30 w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent/80 text-accent-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group"
            aria-label="Open AI Assistant"
          >
            <BrainCircuit className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
              expanded
                ? "bottom-4 right-4 left-4 top-4 sm:left-auto sm:w-[560px] sm:top-4"
                : "bottom-6 right-6 w-[380px] h-[520px] max-h-[80vh]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <BrainCircuit className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">AI Copilot</h3>
                <p className="text-[10px] text-muted-foreground">Property management assistant</p>
              </div>
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Sparkles className="h-8 w-8 text-accent/30 mb-3" />
                  <p className="text-xs text-muted-foreground mb-4">Ask me anything about your properties</p>
                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    {quickPrompts.map((qp, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(qp.replace(/^[^\s]+ /, ""))}
                        className="text-[11px] px-2.5 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground text-left truncate"
                      >
                        {qp}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                        <BrainCircuit className="h-3 w-3 text-accent" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:mb-1.5 [&_ul]:mb-1.5 [&_li]:mb-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                    <BrainCircuit className="h-3 w-3 text-accent animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="h-9 w-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-50 hover:bg-accent/90 transition-colors shrink-0"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingAIAssistant;
