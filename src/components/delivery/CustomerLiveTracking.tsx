/**
 * CustomerLiveTracking — DDD. Customer-facing real-time tracking portal.
 * Live map, dynamic ETA, step notifications, driver chat.
 * PASS97-DDD
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Clock, MessageCircle, Phone,
  CheckCircle2, Package, Truck, Home, Star, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface TrackingStep {
  id: string;
  label: string;
  icon: typeof Package;
  status: "done" | "active" | "pending";
  time?: string;
}

interface ChatMessage {
  id: string;
  sender: "customer" | "driver";
  text: string;
  time: string;
}

interface Props {
  jobId?: string;
  className?: string;
}

export default function CustomerLiveTracking({ jobId, className }: Props) {
  const [eta, setEta] = useState(18);
  const [driverLat, setDriverLat] = useState(48.855);
  const [driverLng, setDriverLng] = useState(2.345);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m1", sender: "driver", text: "Bonjour ! J'ai récupéré votre colis, en route 🚗", time: "14:32" },
    { id: "m2", sender: "customer", text: "Super, merci ! Je suis à l'adresse indiquée.", time: "14:33" },
  ]);

  const steps: TrackingStep[] = [
    { id: "confirmed", label: "Commande confirmée", icon: CheckCircle2, status: "done", time: "14:15" },
    { id: "picked_up", label: "Colis récupéré", icon: Package, status: "done", time: "14:30" },
    { id: "in_transit", label: "En route vers vous", icon: Truck, status: "active", time: "14:32" },
    { id: "delivered", label: "Livré", icon: Home, status: "pending" },
  ];

  const driverInfo = {
    name: "Mamadou K.",
    vehicle: "Scooter électrique",
    rating: 4.8,
    photo: "🧑‍💼",
    phone: "+33 6 XX XX XX",
  };

  // Simulate ETA countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setEta(prev => Math.max(1, prev - 1));
      setDriverLat(prev => prev + (Math.random() - 0.4) * 0.0008);
      setDriverLng(prev => prev + (Math.random() - 0.3) * 0.0008);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    haptic("light");
    setMessages(prev => [...prev, {
      id: `m-${Date.now()}`,
      sender: "customer",
      text: chatInput,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    }]);
    setChatInput("");
    // Simulate driver response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `m-${Date.now()}-r`,
        sender: "driver",
        text: "Bien reçu ! J'arrive bientôt 👍",
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      }]);
    }, 3000);
  };

  const dropoffLat = 48.862;
  const dropoffLng = 2.352;

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header with ETA */}
      <div className="rounded-xl p-4 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))", border: "1px solid hsl(var(--primary) / 0.15)" }}>
        <p className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Arrivée estimée</p>
        <motion.p className="text-3xl font-black mt-1" style={{ color: "hsl(var(--primary))" }}
          key={eta} initial={{ scale: 1.1 }} animate={{ scale: 1 }}>
          {eta} <span className="text-sm font-semibold">min</span>
        </motion.p>
        <p className="text-[9px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Mise à jour automatique en temps réel
        </p>
      </div>

      {/* Live Map Simulation */}
      <div className="rounded-xl relative overflow-hidden" style={{ background: "hsl(var(--muted) / 0.15)", border: "1px solid hsl(var(--border) / 0.1)", height: 180 }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)", backgroundSize: "20px 20px" }} />

        {/* Driver marker */}
        <motion.div className="absolute z-10"
          animate={{
            left: `${((driverLng - 2.34) / 0.025) * 100}%`,
            top: `${((48.865 - driverLat) / 0.015) * 100}%`,
          }}
          transition={{ duration: 2 }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center -ml-5 -mt-5"
            style={{ background: "hsl(var(--primary))", boxShadow: "0 0 12px hsl(var(--primary) / 0.4)" }}>
            <Truck className="h-4 w-4 text-white" />
          </div>
          <motion.div className="absolute inset-0 rounded-full -ml-5 -mt-5 w-10 h-10"
            style={{ border: "2px solid hsl(var(--primary) / 0.3)" }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 2 }} />
        </motion.div>

        {/* Destination marker */}
        <div className="absolute z-10"
          style={{
            left: `${((dropoffLng - 2.34) / 0.025) * 100}%`,
            top: `${((48.865 - dropoffLat) / 0.015) * 100}%`,
          }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center -ml-4 -mt-4"
            style={{ background: "hsl(var(--success))", boxShadow: "0 0 8px hsl(var(--success) / 0.3)" }}>
            <Home className="h-3.5 w-3.5 text-white" />
          </div>
        </div>

        {/* Label */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg" style={{ background: "hsl(var(--background) / 0.85)" }}>
          <p className="text-[8px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            📍 {driverLat.toFixed(4)}, {driverLng.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Driver Info */}
      <div className="rounded-xl p-3 flex items-center gap-3"
        style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.1)" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: "hsl(var(--primary) / 0.1)" }}>
          {driverInfo.photo}
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{driverInfo.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{driverInfo.vehicle}</span>
            <span className="text-[9px] flex items-center gap-0.5" style={{ color: "hsl(var(--warning))" }}>
              <Star className="h-2.5 w-2.5" /> {driverInfo.rating}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="h-8 w-8 p-0" onClick={() => { setChatOpen(!chatOpen); haptic("light"); }}
            style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="h-8 w-8 p-0"
            onClick={() => { haptic("medium"); toast.info("Appel en cours…"); }}
            style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
            <Phone className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="rounded-xl p-3 space-y-0"
        style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isLast = i === steps.length - 1;
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: step.status === "done" ? "hsl(var(--success))" :
                      step.status === "active" ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.5)",
                  }}>
                  <Icon className="h-3 w-3" style={{ color: step.status === "pending" ? "hsl(var(--muted-foreground))" : "#fff" }} />
                </div>
                {!isLast && (
                  <div className="w-0.5 h-6 my-1" style={{
                    background: step.status === "done" ? "hsl(var(--success))" : "hsl(var(--muted) / 0.3)",
                  }} />
                )}
              </div>
              <div className="pb-2">
                <p className="text-[11px] font-semibold" style={{
                  color: step.status === "pending" ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                }}>
                  {step.label}
                  {step.status === "active" && (
                    <motion.span className="inline-block ml-1" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                      ●
                    </motion.span>
                  )}
                </p>
                {step.time && <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{step.time}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <div className="p-2 space-y-2 max-h-40 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%] rounded-xl px-3 py-1.5"
                    style={{
                      background: m.sender === "customer" ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.5)",
                      color: m.sender === "customer" ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    }}>
                    <p className="text-[10px]">{m.text}</p>
                    <p className="text-[7px] mt-0.5 opacity-60">{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 p-2 pt-0">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Message…" className="h-8 text-xs flex-1"
                style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
              <Button size="sm" className="h-8 w-8 p-0" onClick={sendMessage}
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rate after delivery hint */}
      <div className="rounded-xl p-3 text-center"
        style={{ background: "hsl(var(--muted) / 0.15)", border: "1px solid hsl(var(--border) / 0.08)" }}>
        <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          ⭐ N'oubliez pas d'évaluer votre livreur après la livraison
        </p>
      </div>
    </div>
  );
}
