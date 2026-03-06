import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { BrainCircuit, Send, Loader2, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Locale } from "@/lib/i18n";
import { useRentalData } from "@/hooks/useRentalData";

interface Message {
  role: "user" | "assistant";
  content: string;
}

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
    vacantCount: properties.filter(p => !tenants.some(t => t.property_id === p.id)).length,
    unpaidCount: 0, // Could be enriched
    userName: user?.user_metadata?.name || user?.email,
  });

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { message: text.trim(), context: buildContext(), locale },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Désolé, une erreur s'est produite. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = () => {
    sendMessage(t("dashboard.ai_question"));
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
        {/* Header */}
        <div className="text-center mb-6 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-3">
            <BrainCircuit className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{t("page.ai.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("page.ai.subtitle")}</p>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto bg-card rounded-xl shadow-card border border-border/50 p-4 mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground text-sm mb-4">{t("page.ai.hint")}</p>
              <button
                onClick={handleQuickAction}
                className="bg-gradient-gold text-accent-foreground px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm shadow-gold"
              >
                {t("dashboard.ai_question")}
              </button>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center shrink-0 mt-1">
                    <BrainCircuit className="h-4 w-4 text-accent-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center shrink-0">
                <BrainCircuit className="h-4 w-4 text-accent-foreground" />
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
            placeholder={t("page.ai.placeholder")}
            disabled={loading}
            className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gradient-gold text-accent-foreground px-5 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-gold disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AIAssistant;
