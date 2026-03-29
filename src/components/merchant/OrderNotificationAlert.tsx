/**
 * OrderNotificationAlert — Full-screen modal for incoming orders.
 * Plays looping sound + vibration until accepted/rejected.
 */
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ShoppingBag, Clock, DollarSign, MapPin, User } from "lucide-react";
import { NotificationVibration } from "@/families/notifications/notification-vibration";

export interface IncomingOrder {
  id: string;
  customerName: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  currency: string;
  type: "delivery" | "pickup" | "dine_in";
  address?: string;
  createdAt: string;
}

interface Props {
  order: IncomingOrder | null;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
}

function OrderNotificationAlert({ order, onAccept, onReject }: Props) {
  const audioRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAlert = useCallback(() => {
    // Sound — procedural two-tone alert
    try {
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const playTone = () => {
        if (!audioRef.current || audioRef.current.state === "closed") return;
        const osc = audioRef.current.createOscillator();
        const gain = audioRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioRef.current.destination);
        osc.frequency.setValueAtTime(880, audioRef.current.currentTime);
        osc.frequency.setValueAtTime(1100, audioRef.current.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioRef.current.currentTime + 0.5);
        osc.start();
        osc.stop(audioRef.current.currentTime + 0.5);
      };
      playTone();
      const interval = setInterval(playTone, 2000);
      oscillatorRef.current = { stop: () => clearInterval(interval) } as any;
    } catch (e) {
      console.warn("Audio alert failed:", e);
    }

    // Vibration — via canonical family
    NotificationVibration.startRepeating([200, 100, 200], 2000);
  }, []);

  const stopAlert = useCallback(() => {
    try { oscillatorRef.current?.stop(); } catch {}
    try { audioRef.current?.close(); } catch {}
    NotificationVibration.stop();
    audioRef.current = null;
    oscillatorRef.current = null;
  }, []);

  useEffect(() => {
    if (order) startAlert();
    else stopAlert();
    return stopAlert;
  }, [order, startAlert, stopAlert]);

  const handleAccept = useCallback(() => {
    if (!order) return;
    stopAlert();
    onAccept(order.id);
  }, [order, onAccept, stopAlert]);

  const handleReject = useCallback(() => {
    if (!order) return;
    stopAlert();
    onReject(order.id);
  }, [order, onReject, stopAlert]);

  return (
    <AnimatePresence>
      {order && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "hsl(0 0% 0% / 0.85)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: "hsl(var(--hud-success) / 0.15)" }}>
                  <ShoppingBag className="w-6 h-6" style={{ color: "hsl(var(--hud-success))" }} />
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: "hsl(var(--hud-text))" }}>New Order!</p>
                  <p className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                    {order.type === "delivery" ? "🚚 Delivery" : order.type === "pickup" ? "📦 Pickup" : "🍽️ Dine-in"}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--hud-surface))" }}>
                <User className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
                <span className="text-sm font-semibold min-w-0 break-words leading-snug" style={{ color: "hsl(var(--hud-text))" }}>{order.customerName}</span>
              </div>

              {/* Items */}
              <div className="space-y-1.5 mb-3 max-h-[140px] overflow-y-auto">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-surface) / 0.5)" }}>
                     <span className="text-xs font-medium min-w-0 flex-1 break-words leading-snug" style={{ color: "hsl(var(--hud-text) / 0.8)" }}>
                       {item.qty}× {item.name}
                     </span>
                    <span className="text-xs font-bold shrink-0 ml-2" style={{ color: "hsl(var(--hud-text))" }}>
                      {item.price.toFixed(2)} {order.currency}
                    </span>
                  </div>
                ))}
              </div>

              {/* Address */}
              {order.address && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--hud-surface))" }}>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-warning))" }} />
                  <span className="text-[11px] min-w-0 break-words leading-snug" style={{ color: "hsl(var(--hud-text-dim) / 0.7)" }}>{order.address}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between px-3 py-3 rounded-xl" style={{ background: "hsl(var(--hud-cyan) / 0.08)" }}>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
                  <span className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.7)" }}>Total</span>
                </div>
                <span className="text-lg font-black" style={{ color: "hsl(var(--hud-text))" }}>
                  {order.total.toFixed(2)} {order.currency}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1.5 mt-2 justify-center">
                <Clock className="w-3 h-3" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
                <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {new Date(order.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 p-4 pt-2">
              <button
                onClick={handleReject}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform min-h-[48px]"
                style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}
              >
                <X className="w-5 h-5" />
                Reject
              </button>
              <button
                onClick={handleAccept}
                className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform min-h-[48px]"
                style={{ background: "hsl(var(--hud-success))", color: "#fff" }}
              >
                <Check className="w-5 h-5" />
                Accept
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(OrderNotificationAlert);
