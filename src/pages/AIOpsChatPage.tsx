/**
 * AIOpsChatPage — AI-powered ops assistant chat.
 */
import { useEffect, useMemo, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { createAIThread, sendAIMessage } from "@/lib/ai/ops-chat";
import { supabase } from "@/integrations/supabase/client";

export default function AIOpsChatPage() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    createAIThread({ title: "Ops Assistant" }).then((t: any) => {
      if (!active) return;
      setThreadId(t.id);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!threadId) return;
    let mounted = true;

    supabase
      .from("ai_chat_messages" as any)
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!mounted) return;
        setMessages((data as any[]) ?? []);
      });

    const sub = supabase
      .channel(`ai:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();

    return () => { mounted = false; sub.unsubscribe(); };
  }, [threadId]);

  const canSend = useMemo(() => !!threadId && !!input.trim() && !sending, [threadId, input, sending]);

  const send = async () => {
    if (!canSend || !threadId) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendAIMessage({ threadId, content });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <BackCard />
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Ops Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Ask for operations, dispatch, fraud, payments, support, marketplace, onboarding
          </p>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {messages.map((m: any) => (
            <div key={m.id} className={`rounded-2xl p-3 ${m.role === "assistant" ? "bg-muted" : "bg-primary/10"}`}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">{m.role}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI ops assistant..."
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
          />
          <button
            onClick={send}
            disabled={!canSend}
            className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
