/**
 * LEGACY ISOLATED MODULE
 * --------------------------------------------
 * This file is intentionally isolated from Orbit V2+ core.
 * Do not import Orbit core messaging services here.
 * Do not mix with canonical V2+ Orbit chain.
 * Migrate later as its own domain-specific module.
 *
 * LiveDeliveryChat — Real-time delivery chat using conversation_threads + messages.
 * Replaces mock data with actual DB-backed messaging via Supabase Realtime.
 * PASS100: MOCK → REAL
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, MapPin, Phone, Navigation, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sendText } from "@/families/send/send-text";
import { sendLocation } from "@/families/send/send-location";
import type { SendContext } from "@/families/send/send-context";

interface Props {
  jobId?: string;
  onClose?: () => void;
}

export default function LiveDeliveryChat({ jobId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find or get the conversation thread for this delivery job
  const { data: thread } = useQuery({
    queryKey: ["delivery-chat-thread", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data } = await (supabase as any)
        .from("conversations_v2")
        .select("*")
        .eq("type", "delivery")
        .contains("metadata", { context_id: jobId })
        .maybeSingle();
      return data;
    },
    enabled: !!jobId,
  });

  // Load messages for this thread
  const { data: messages = [] } = useQuery({
    queryKey: ["delivery-chat-messages", thread?.id],
    queryFn: async () => {
      if (!thread?.id) return [];
      const { data } = await (supabase as any)
        .from("chat_messages_v2")
        .select("*")
        .eq("conversation_id", thread.id)
        .order("created_at", { ascending: true })
        .limit(100);
      return data || [];
    },
    enabled: !!thread?.id,
  });

  // Load driver info from the delivery job
  const { data: job } = useQuery({
    queryKey: ["delivery-chat-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data } = await (supabase as any)
        .from("mobility_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();
      return data;
    },
    enabled: !!jobId,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!thread?.id) return;
    const channel = supabase
      .channel(`delivery-chat-${thread.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages_v2",
        filter: `conversation_id=eq.${thread.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["delivery-chat-messages", thread.id] });
      })
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [thread?.id, qc]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const buildCtx = useCallback((): SendContext | null => {
    if (!thread?.id || !user?.id) return null;
    return {
      conversationId: thread.id,
      senderUserId: user.id,
      senderOrbitId: `orbit_${user.id.slice(0, 12)}`,
    };
  }, [thread?.id, user?.id]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const ctx = buildCtx();
    if (!ctx) return;
    const text = input.trim();
    setInput("");
    await sendText(ctx, text);
  }, [input, buildCtx]);

  const shareLocation = useCallback(async () => {
    const ctx = buildCtx();
    if (!ctx) return;
    const { requestLocation } = await import("@/lib/location/requestLocation");
    const pos = await requestLocation();
    if (!pos) return;
    await sendLocation(ctx, { lat: pos.lat, lng: pos.lng, type: "static" });
    setShowLocation(false);
  }, [buildCtx]);

  const driverName = job?.profiles
    ? `${job.profiles.first_name || ""} ${job.profiles.last_name || ""}`.trim() || "Driver"
    : "Driver";

  const getSenderType = (senderId: string) => {
    if (senderId === user?.id) return "customer";
    if (senderId === job?.driver_id) return "driver";
    return "system";
  };

  const senderCfg = {
    customer: { align: "flex-end" as const, bg: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" },
    driver: { align: "flex-start" as const, bg: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" },
    system: { align: "center" as const, bg: "hsl(var(--warning) / 0.06)", color: "hsl(var(--warning))" },
  };

  // No thread yet = show placeholder
  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageCircle className="h-8 w-8 mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
        <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          Le chat démarre quand le livreur accepte la mission
        </p>
        {onClose && (
          <Button size="sm" variant="ghost" className="mt-3 text-xs h-8" onClick={onClose}
            style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Fermer</Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Chat Livraison</h3>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--success))" }} />
        </div>
        <div className="flex items-center gap-1">
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
          <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{driverName}</p>
          <span className="text-[8px]" style={{ color: "hsl(var(--success))" }}>● En ligne</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-none">
        {messages.length === 0 && (
          <p className="text-center text-[10px] py-4" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
            Aucun message pour l'instant
          </p>
        )}
        {messages.map((msg: any) => {
          const type = getSenderType(msg.sender_id);
          const cfg = senderCfg[type];
          const isSystem = msg.message_type === "system";
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="flex" style={{ justifyContent: isSystem ? "center" : cfg.align }}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 ${isSystem ? "w-full" : ""}`}
                style={{ background: cfg.bg, border: isSystem ? `1px solid ${cfg.color}15` : undefined }}>
                {isSystem ? (
                  <p className="text-[9px] text-center font-medium" style={{ color: cfg.color }}>{msg.content}</p>
                ) : (
                  <>
                    {msg.message_type === "location" && (
                      <div className="rounded-lg p-2 mb-1" style={{ background: "hsl(var(--hud-bg))" }}>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" style={{ color: "hsl(var(--info))" }} />
                          <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--info))" }}>Position partagée</span>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px]" style={{ color: cfg.color }}>{msg.content}</p>
                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                      <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {type === "customer" && (
                        <CheckCheck className="h-2.5 w-2.5" style={{ color: msg.read_at ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.2)" }} />
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
