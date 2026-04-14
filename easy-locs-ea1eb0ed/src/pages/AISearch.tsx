import DashboardLayout from "@/components/dashboard/DashboardLayout";
import WebSources, { WebSource } from "@/components/ai/WebSources";
import { Globe, Send, Loader2, User, Search, Sparkles, RotateCcw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useUiEngine } from "@/hooks/useUiEngine";

interface SearchMessage {
  role: "user" | "assistant";
  content: string;
  sources?: WebSource[];
  searching?: boolean;
}

const WEB_SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-web-search`;

const SUGGESTED_QUERIES = [
  "Quelles sont les obligations légales d'un propriétaire bailleur en France ?",
  "Comment optimiser la fiscalité d'un investissement locatif ?",
  "Tendances du marché immobilier en 2024",
  "Comment rédiger une annonce immobilière efficace ?",
  "Quels sont les meilleurs quartiers pour investir à Paris ?",
  "Comment calculer la rentabilité d'un bien locatif ?",
];

const AISearch = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<SearchMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { session } = useAuth();
  const { locale } = useI18n();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const sendQuery = async (text: string) => {
    if (!text.trim() || loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: SearchMessage = { role: "user", content: text.trim() };
    const searchingMsg: SearchMessage = { role: "assistant", content: "", sources: [], searching: true };
    const updatedMessages = [...messages, userMsg];
    setMessages([...updatedMessages, searchingMsg]);
    setInput("");
    setLoading(true);

    let assistantContent = "";
    let sources: WebSource[] = [];

    try {
      const conversationMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(WEB_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          question: text.trim(),
          messages: conversationMessages,
          locale,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Trop de requêtes. Veuillez patienter."); throw new Error("429"); }
        if (resp.status === 402) { toast.error("Crédits AI épuisés."); throw new Error("402"); }
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

            // Check for sources metadata (first message from our function)
            if (parsed.sources !== undefined) {
              sources = parsed.sources ?? [];
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1
                    ? { ...m, sources, searching: false }
                    : m
                  );
                }
                return prev;
              });
              continue;
            }

            // AI delta content
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1
                    ? { ...m, content: assistantContent, searching: false }
                    : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent, sources, searching: false }];
              });
            }
          } catch { /* partial JSON */ }
        }
      }

      if (!assistantContent) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1
              ? { ...m, content: "Désolé, aucune réponse générée.", searching: false }
              : m
            );
          }
          return [...prev, { role: "assistant", content: "Désolé, aucune réponse générée.", sources, searching: false }];
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1).concat([{ role: "assistant", content: "Une erreur est survenue. Veuillez réessayer.", searching: false }]);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useUiEngine("aisearch");

  const isEmpty = messages.length === 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100dvh - 6rem)" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-none">AI Search</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Recherche web en temps réel avec synthèse IA</p>
            </div>
          </div>
          {!isEmpty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nouvelle recherche
            </button>
          )}
        </motion.div>

        {/* Messages or empty state */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          <AnimatePresence mode="popLayout">
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full py-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <Search className="h-7 w-7 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Recherchez n'importe quoi</h2>
                <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
                  L'IA recherche sur le web et synthétise les résultats avec les sources citées.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                  {SUGGESTED_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendQuery(q)}
                      className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted hover:border-accent/30 transition-colors text-foreground leading-snug"
                    >
                      <Sparkles className="h-3 w-3 text-accent inline mr-1.5 shrink-0" />
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center shrink-0 mt-1">
                      <Globe className="h-4 w-4 text-blue-500" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${msg.role === "user" ? "" : "flex-1"}`}>
                    <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}>
                      {msg.role === "assistant" ? (
                        msg.searching ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Recherche en cours...</span>
                          </div>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "assistant" && !msg.searching && msg.sources && msg.sources.length > 0 && (
                      <WebSources sources={msg.sources} />
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez une question, l'IA cherche sur le web..."
              disabled={loading}
              autoFocus
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AISearch;
