import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { BrainCircuit, Send, Loader2, User, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useRentalData } from "@/hooks/useRentalData";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const AIAssistant = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { properties, tenants } = useRentalData();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = () => ({
    propertiesCount: properties.length,
    tenantsCount: tenants.length,
    vacantCount: properties.filter(p => !tenants.some(tn => tn.property_id === p.id)).length,
    userName: user?.user_metadata?.name || user?.email,
  });

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
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          context: buildContext(),
          locale,
          task: "chat",
          stream: true,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Rate limit exceeded. Please try again later."); throw new Error("429"); }
        if (resp.status === 402) { toast.error("AI credits depleted. Please add credits."); throw new Error("402"); }
        throw new Error("Stream failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
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
          } catch { /* partial JSON, wait */ }
        }
      }

      // If no streaming content came through, ensure we have a message
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const quickActions = [
    { label: t("page.ai.qa_listing") || "✍️ Write a listing description", prompt: "Help me write an attractive listing description for a vacation rental property. Ask me about the property details." },
    { label: t("page.ai.qa_reply") || "💬 Draft a guest reply", prompt: "Help me draft a professional reply to a guest inquiry. What is the guest's message?" },
    { label: t("page.ai.qa_seo") || "🔍 Improve my listing SEO", prompt: "Help me improve the SEO of my property listing. Ask me to share my current listing title and description." },
    { label: t("page.ai.qa_summary") || "📊 Summarize my activity", prompt: `Give me a summary and recommendations based on my portfolio: ${properties.length} properties, ${tenants.length} tenants, ${properties.filter(p => !tenants.some(tn => tn.property_id === p.id)).length} vacant.` },
    { label: t("page.ai.qa_legal") || "⚖️ Legal advice", prompt: "What are the key legal obligations for a property landlord? Ask me which country my property is in." },
    { label: t("page.ai.qa_marketing") || "🚀 Marketing tips", prompt: "Give me 5 actionable marketing tips to increase bookings for my vacation rental properties." },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
        {/* Header */}
        <div className="text-center mb-4 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-3">
            <BrainCircuit className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{t("page.ai.title") || "AI Copilot"}</h1>
          <p className="text-muted-foreground text-sm">{t("page.ai.subtitle") || "Your smart property management assistant"}</p>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto bg-card rounded-xl shadow-card border border-border/50 p-4 mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Sparkles className="h-10 w-10 text-accent/30 mb-4" />
              <p className="text-muted-foreground text-sm mb-6 text-center max-w-sm">
                {t("page.ai.hint") || "Ask me anything about property management, or pick a quick action below."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {quickActions.map((qa, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(qa.prompt)}
                    className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground truncate"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-1">
                    <BrainCircuit className="h-4 w-4 text-accent" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && !messages.some(m => m.role === "assistant" && m === messages[messages.length - 1]) && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <BrainCircuit className="h-4 w-4 text-accent" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-3 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("page.ai.placeholder") || "Ask anything about property management..."}
            disabled={loading}
            className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-accent text-accent-foreground px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AIAssistant;
