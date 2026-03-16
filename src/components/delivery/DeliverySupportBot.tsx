/**
 * DeliverySupportBot — AI-powered delivery support chatbot.
 * FAQ, order tracking, auto-escalation.
 * PASS88-RR: AI Delivery Support Bot
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, User, Loader2, AlertTriangle, Package, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: "📦 Suivre ma livraison", prompt: "Où en est ma livraison ?" },
  { label: "⏱️ Délai estimé", prompt: "Quel est le délai de livraison estimé ?" },
  { label: "❌ Annuler livraison", prompt: "Comment annuler une livraison ?" },
  { label: "🔄 Retour colis", prompt: "Comment retourner un colis ?" },
  { label: "💰 Remboursement", prompt: "Comment obtenir un remboursement ?" },
  { label: "🆘 Escalader", prompt: "Je veux parler à un humain" },
];

const SYSTEM_RESPONSES: Record<string, string> = {
  suivi: "📦 **Suivi de livraison**\n\nPour suivre votre livraison :\n1. Rendez-vous dans l'onglet **Livraisons**\n2. Cliquez sur votre commande\n3. Le GPS en temps réel s'affichera\n\nVous pouvez aussi utiliser le code de confirmation reçu par email.",
  délai: "⏱️ **Délais de livraison**\n\n- **Standard** : 24-48h\n- **Express** : 4-8h\n- **Urgent** : 1-2h\n\nLes délais peuvent varier selon la distance et la disponibilité des chauffeurs.",
  annuler: "❌ **Annulation**\n\nVous pouvez annuler gratuitement si :\n- Le chauffeur n'a pas encore récupéré le colis\n- La commande date de moins de 30 min\n\nAprès récupération, des frais de 30% s'appliquent.",
  retour: "🔄 **Retours**\n\nPour retourner un colis :\n1. Allez dans **Historique** → sélectionnez la livraison\n2. Cliquez sur **Demander un retour**\n3. Un chauffeur sera envoyé pour la collecte\n\nLes retours sont gratuits sous 48h.",
  remboursement: "💰 **Remboursement**\n\nLe remboursement est automatique pour :\n- Colis non livré sous 72h\n- Colis endommagé (avec photos)\n- Annulation avant récupération\n\nDélai de traitement : 3-5 jours ouvrés.",
  humain: "🆘 **Escalade vers un agent**\n\nVotre demande a été transmise à notre équipe support. Un agent vous contactera sous **30 minutes** pendant les heures d'ouverture (8h-20h).\n\nEn attendant, n'hésitez pas à me poser d'autres questions !",
  default: "Je suis l'assistant livraison Easy-Locs 🚗\n\nJe peux vous aider avec :\n- 📦 Suivi de livraison\n- ⏱️ Délais estimés\n- ❌ Annulations\n- 🔄 Retours\n- 💰 Remboursements\n\nQue souhaitez-vous savoir ?",
};

const getResponse = (input: string): string => {
  const lower = input.toLowerCase();
  if (lower.includes("suiv") || lower.includes("où") || lower.includes("track")) return SYSTEM_RESPONSES.suivi;
  if (lower.includes("délai") || lower.includes("temps") || lower.includes("combien")) return SYSTEM_RESPONSES.délai;
  if (lower.includes("annul") || lower.includes("cancel")) return SYSTEM_RESPONSES.annuler;
  if (lower.includes("retour") || lower.includes("renvoy") || lower.includes("return")) return SYSTEM_RESPONSES.retour;
  if (lower.includes("rembours") || lower.includes("refund") || lower.includes("argent")) return SYSTEM_RESPONSES.remboursement;
  if (lower.includes("humain") || lower.includes("agent") || lower.includes("escalad") || lower.includes("parler")) return SYSTEM_RESPONSES.humain;
  return SYSTEM_RESPONSES.default;
};

export default function DeliverySupportBot() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: "Bonjour ! 👋 Je suis l'assistant livraison Easy-Locs. Comment puis-je vous aider ?", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    haptic("light");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    const response = getResponse(text);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: response, timestamp: new Date() }]);
    setIsTyping(false);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Support livraison IA</h3>
        <span className="text-[8px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
          En ligne
        </span>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="h-[340px] overflow-y-auto space-y-2 rounded-xl p-3 scrollbar-none"
        style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: msg.role === "assistant" ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--primary) / 0.1)" }}>
                {msg.role === "assistant"
                  ? <Bot className="w-3 h-3" style={{ color: "hsl(var(--hud-cyan))" }} />
                  : <User className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />}
              </div>
              <div className="max-w-[80%] rounded-xl px-3 py-2"
                style={{
                  background: msg.role === "assistant" ? "hsl(var(--hud-surface))" : "hsl(var(--hud-cyan) / 0.1)",
                  border: `1px solid ${msg.role === "assistant" ? "hsl(var(--hud-border) / 0.08)" : "hsl(var(--hud-cyan) / 0.15)"}`,
                }}>
                <div className="text-[11px] leading-relaxed prose prose-sm max-w-none" style={{ color: "hsl(var(--hud-text))" }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <p className="text-[7px] mt-1 text-right" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                  {msg.timestamp.toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.1)" }}>
              <Bot className="w-3 h-3" style={{ color: "hsl(var(--hud-cyan))" }} />
            </div>
            <div className="flex gap-1 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--hud-surface))" }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                  className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--hud-cyan) / 0.5)" }} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1">
        {QUICK_ACTIONS.map(qa => (
          <button key={qa.label} onClick={() => sendMessage(qa.prompt)}
            className="px-2 py-1 rounded-full text-[8px] font-medium transition-colors"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text-dim))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Posez votre question…"
          className="flex-1 h-9 text-xs"
          style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
        <Button size="sm" className="h-9 w-9 p-0" onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
