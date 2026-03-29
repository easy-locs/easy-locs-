/**
 * AIShoppingAssistant — AI chatbot integrated into shop pages.
 * Uses Lovable AI for product recommendations, search, FAQ.
 */
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, X, Sparkles, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  shopId: string;
  shopName: string;
  catalogItems?: any[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AIShoppingAssistant({ shopId, shopName, catalogItems = [] }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const buildContext = () => {
    const items = catalogItems.slice(0, 30).map(i =>
      `- ${i.title} (${i.price} ${i.currency || "EUR"})${i.description ? ": " + i.description.slice(0, 80) : ""}`
    ).join("\n");
    return `You are a helpful shopping assistant for "${shopName}". 
Available products:\n${items || "No products listed yet."}
Help customers find products, compare options, and answer questions. Be concise and friendly. Use markdown for formatting.`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await storefrontRepo.invokeAIShoppingChat({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        system: buildContext(),
        shop_id: shopId,
      });

      if (error) throw error;
      const reply = data?.reply || "Sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-2xl border-primary/20 overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="text-sm font-semibold">Shopping Assistant</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-64 overflow-y-auto p-3 space-y-3 bg-background">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Ask me about products, recommendations, or anything!</p>
              <div className="flex flex-wrap gap-1 mt-3 justify-center">
                {["What's popular?", "Best deals?", "Help me choose"].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-xs prose-p:m-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-2 border-t border-border flex gap-1.5">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask about products..."
            className="h-8 text-xs flex-1"
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendMessage} disabled={!input.trim() || loading}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
