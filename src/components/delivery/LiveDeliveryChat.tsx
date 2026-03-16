/**
 * LiveDeliveryChat — HHH. Live Delivery Chat
 * Real-time chat between customer and driver with location sharing.
 * PASS92-HHH
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, MapPin, Image, Mic, Phone, Navigation, Clock, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  sender: "customer" | "driver" | "system";
  type: "text" | "location" | "image" | "eta" | "status";
  content: string;
  timestamp: string;
  read: boolean;
  lat?: number;
  lng?: number;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: "m1", sender: "system", type: "status", content: "🚗 Mohamed K. a accepté votre livraison", timestamp: "10:15", read: true },
  { id: "m2", sender: "driver", type: "text", content: "Bonjour ! Je suis en route vers le point de retrait.", timestamp: "10:16", read: true },
  { id: "m3", sender: "customer", type: "text", content: "Parfait, merci ! L'entrée est au code 4521.", timestamp: "10:17", read: true },
  { id: "m4", sender: "driver", type: "location", content: "📍 Position partagée", timestamp: "10:20", read: true, lat: 48.8566, lng: 2.3522 },
  { id: "m5", sender: "system", type: "eta", content: "⏱️ Arrivée estimée dans 8 minutes", timestamp: "10:22", read: true },
  { id: "m6", sender: "driver", type: "text", content: "J'ai récupéré le colis, je suis en route !", timestamp: "10:30", read: true },
  { id: "m7", sender: "system", type: "status", content: "📦 Colis récupéré — en route vers la destination", timestamp: "10:30", read: true },
  { id: "m8", sender: "driver", type: "text", content: "Je suis presque arrivé, dans 2 min", timestamp: "10:42", read: false },
];

export default function LiveDeliveryChat({ jobId, onClose }: { jobId?: string; onClose?: () => void }) {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      id: `m${Date.now()}`, sender: "customer", type: "text", content: input,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), read: false,
    }]);
    setInput("");
  };

  const shareLocation = () => {
    setMessages(prev => [...prev, {
      id: `m${Date.now()}`, sender: "customer", type: "location", content: "📍 Ma position",
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), read: false,
      lat: 48.8606, lng: 2.3376,
    }]);
    setShowLocation(false);
  };

  const senderCfg = {
    customer: { align: "flex-end", bg: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))", label: "Vous" },
    driver: { align: "flex-start", bg: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))", label: "Chauffeur" },
    system: { align: "center", bg: "hsl(var(--warning) / 0.06)", color: "hsl(var(--warning))", label: "Système" },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Chat Livraison</h3>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--success))" }} />
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" style={{ color: "hsl(var(--info))" }}>
            <Phone className="h-3.5 w-3.5" />
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={onClose}
              style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>✕</Button>
          )}
        </div>
      </div>

      {/* Driver info */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.12)" }}>
          <Navigation className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Mohamed K.</p>
          <div className="flex items-center gap-2">
            <span className="text-[8px]" style={{ color: "hsl(var(--success))" }}>● En ligne</span>
            <span className="text-[8px]" style={{ color: "hsl(var(--warning))" }}>⭐ 4.8</span>
            <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>🚗 Peugeot 208</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>ETA 2min</p>
          <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>1.2 km</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-none">
        {messages.map(msg => {
          const cfg = senderCfg[msg.sender];
          const isSystem = msg.sender === "system";
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="flex" style={{ justifyContent: cfg.align }}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 ${isSystem ? "w-full" : ""}`}
                style={{ background: cfg.bg, border: isSystem ? `1px solid ${cfg.color}15` : undefined }}>
                {isSystem ? (
                  <p className="text-[9px] text-center font-medium" style={{ color: cfg.color }}>{msg.content}</p>
                ) : (
                  <>
                    {msg.type === "location" && (
                      <div className="rounded-lg p-2 mb-1" style={{ background: "hsl(var(--hud-bg))" }}>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" style={{ color: "hsl(var(--info))" }} />
                          <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--info))" }}>Position partagée</span>
                        </div>
                        <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                          {msg.lat?.toFixed(4)}, {msg.lng?.toFixed(4)}
                        </p>
                      </div>
                    )}
                    <p className="text-[10px]" style={{ color: cfg.color }}>{msg.type !== "location" ? msg.content : ""}</p>
                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                      <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{msg.timestamp}</span>
                      {msg.sender === "customer" && (
                        <CheckCheck className="h-2.5 w-2.5" style={{ color: msg.read ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.2)" }} />
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5">
        <button onClick={() => setShowLocation(!showLocation)} className="p-2 rounded-lg"
          style={{ background: showLocation ? "hsl(var(--info) / 0.12)" : "hsl(var(--hud-surface))", color: showLocation ? "hsl(var(--info))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
          <MapPin className="h-4 w-4" />
        </button>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Message…"
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          className="h-9 text-[10px] flex-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
        <Button size="sm" className="h-9 w-9 p-0" onClick={sendMessage}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Location share panel */}
      <AnimatePresence>
        {showLocation && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <Button size="sm" className="w-full text-xs h-8" onClick={shareLocation}
              style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
              <MapPin className="h-3.5 w-3.5 mr-1" /> Partager ma position actuelle
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
