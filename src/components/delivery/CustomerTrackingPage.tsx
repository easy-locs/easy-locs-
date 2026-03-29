/**
 * CustomerTrackingPage — Public tracking page for end customers with ETA and status notifications.
 * PASS85-GG: Customer Notifications & Tracking Page
 */
import { useState, useEffect, useCallback } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MapPin, Clock, CheckCircle2, Truck, Phone, Star, Shield, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface TrackingData {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  package_description: string | null;
  delivery_fee: number | null;
  currency: string | null;
  created_at: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  confirmation_code: string | null;
  driver_id: string | null;
  driver_lat?: number | null;
  driver_lng?: number | null;
  driver_vehicle?: string;
  driver_name?: string;
  driver_rating?: number | null;
}

const TRACKING_STEPS = [
  { key: "pending", label: "Commande confirmée", emoji: "📦", icon: Package },
  { key: "assigned", label: "Chauffeur assigné", emoji: "📩", icon: Truck },
  { key: "accepted", label: "Chauffeur en route", emoji: "🚗", icon: Navigation },
  { key: "in_progress", label: "Colis récupéré", emoji: "📍", icon: MapPin },
  { key: "completed", label: "Livré", emoji: "✅", icon: CheckCircle2 },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0, assigned: 1, accepted: 2, in_progress: 3, completed: 4, cancelled: -1,
};

export default function CustomerTrackingPage() {
  const [trackingCode, setTrackingCode] = useState("");
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [eta, setEta] = useState<string | null>(null);

  const fetchTracking = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      // Search by confirmation code or job ID
      const { data, error } = await supabase
        .from("mobility_jobs")
        .select("*")
        .or(`confirmation_code.eq.${code.trim()},id.eq.${code.trim()}`)
        .limit(1)
        .maybeSingle();

      if (error || !data) { toast.error("Livraison introuvable"); setLoading(false); return; }

      const trackingData: TrackingData = data as any;

      // Fetch driver info if assigned
      if ((data as any).rider_user_id) {
        const { data: presence } = await (supabase as any)
          .from("rider_presence")
          .select("lat, lng, vehicle_type")
          .eq("user_id", (data as any).rider_user_id)
          .maybeSingle();

        if (presence) {
          trackingData.driver_lat = presence.lat;
          trackingData.driver_lng = presence.lng;
          trackingData.driver_vehicle = presence.vehicle_type;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, first_name, last_name")
          .eq("id", (data as any).rider_user_id)
          .maybeSingle();

        if (profile) trackingData.driver_name = profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || undefined;
      }

      setTracking(trackingData);
      computeETA(trackingData);
    } catch {
      toast.error("Erreur de recherche");
    } finally {
      setLoading(false);
    }
  }, []);

  const computeETA = (data: TrackingData) => {
    if (data.status === "completed" || data.status === "cancelled") { setEta(null); return; }
    if (data.accepted_at) {
      const elapsed = (Date.now() - new Date(data.accepted_at).getTime()) / 60000;
      const estimated = Math.max(5, 30 - Math.floor(elapsed));
      setEta(`~${estimated} min`);
    } else if (data.status === "assigned") {
      setEta("~35 min");
    } else {
      setEta("Recherche d'un livreur…");
    }
  };

  // Realtime updates
  useEffect(() => {
    if (!tracking?.id) return;
    const channel = supabase
      .channel(`track-${tracking.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mobility_jobs", filter: `id=eq.${tracking.id}` },
        (payload) => {
          const updated = payload.new as any;
          setTracking(prev => prev ? { ...prev, ...updated } : null);
          computeETA(updated);
          // Status notification
          const newStatus = updated.status;
          if (newStatus === "accepted") toast("🚗 Votre livreur est en route !");
          if (newStatus === "in_progress") toast("📍 Colis récupéré, en route vers vous !");
          if (newStatus === "completed") toast.success("✅ Votre colis a été livré !");
        })
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [tracking?.id]);

  const currentStep = tracking ? (STATUS_INDEX[tracking.status] ?? 0) : 0;
  const isCancelled = tracking?.status === "cancelled";

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
          <Package className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          Suivi de livraison
        </h3>
        <div className="flex gap-2">
          <Input value={trackingCode} onChange={e => setTrackingCode(e.target.value)}
            placeholder="Code de suivi ou ID"
            className="h-9 text-xs flex-1"
            onKeyDown={e => e.key === "Enter" && fetchTracking(trackingCode)}
            style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          <Button size="sm" className="h-9 text-xs px-4" onClick={() => fetchTracking(trackingCode)}
            disabled={loading}
            style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
            {loading ? "…" : "Suivre"}
          </Button>
        </div>
      </div>

      {/* Tracking result */}
      <AnimatePresence mode="wait">
        {tracking && (
          <motion.div key={tracking.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">

            {/* Status & ETA */}
            <div className="rounded-xl p-4 text-center"
              style={{
                background: isCancelled ? "hsl(var(--destructive) / 0.05)" : "hsl(var(--hud-cyan) / 0.05)",
                border: `1px solid ${isCancelled ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--hud-cyan) / 0.15)"}`,
              }}>
              {isCancelled ? (
                <>
                  <p className="text-2xl mb-1">❌</p>
                  <p className="text-sm font-bold" style={{ color: "hsl(var(--destructive))" }}>Livraison annulée</p>
                </>
              ) : tracking.status === "completed" ? (
                <>
                  <p className="text-2xl mb-1">✅</p>
                  <p className="text-sm font-bold" style={{ color: "hsl(var(--success))" }}>Livré !</p>
                  {tracking.delivered_at && (
                    <p className="text-[10px] mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
                      {new Date(tracking.delivered_at).toLocaleString("fr")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
                    <span className="text-lg font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{eta}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    Estimation d'arrivée
                  </p>
                </>
              )}
            </div>

            {/* Timeline */}
            {!isCancelled && (
              <div className="rounded-xl p-4"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <div className="space-y-0">
                  {TRACKING_STEPS.map((step, i) => {
                    const isActive = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div key={step.key} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all"
                            style={{
                              background: isActive ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.06)",
                              color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.2)",
                              boxShadow: isCurrent ? "0 0 0 2px hsl(var(--hud-cyan) / 0.3)" : "none",
                            }}>
                            {isActive && i < currentStep ? "✓" : step.emoji}
                          </div>
                          {i < TRACKING_STEPS.length - 1 && (
                            <div className="w-px h-6" style={{ background: isActive ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.1)" }} />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-[11px] font-semibold" style={{ color: isActive ? "hsl(var(--hud-text))" : "hsl(var(--hud-text-dim) / 0.3)" }}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="flex items-center gap-1 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--hud-cyan))" }} />
                              <span className="text-[9px]" style={{ color: "hsl(var(--hud-cyan))" }}>En cours</span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Driver info */}
            {tracking.driver_id && tracking.driver_name && (
              <div className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(var(--hud-cyan) / 0.1)" }}>
                  <Truck className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{tracking.driver_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{tracking.driver_vehicle}</span>
                    {tracking.driver_rating != null && (
                      <span className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>⭐ {tracking.driver_rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Package details */}
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text-dim))" }}>DÉTAILS</p>
              {[
                { label: "Colis", value: tracking.package_description || "Colis standard" },
                { label: "Retrait", value: tracking.pickup_address },
                { label: "Livraison", value: tracking.dropoff_address },
                { label: "Code", value: tracking.confirmation_code || "--" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1 border-b"
                  style={{ borderColor: "hsl(var(--hud-border) / 0.05)" }}>
                  <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{label}</span>
                  <span className="text-[9px] font-semibold text-right max-w-[60%] truncate" style={{ color: "hsl(var(--hud-text))" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Security notice */}
            <div className="rounded-lg px-3 py-2 flex items-center gap-2"
              style={{ background: "hsl(var(--success) / 0.05)", border: "1px solid hsl(var(--success) / 0.1)" }}>
              <Shield className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--success))" }} />
              <p className="text-[9px]" style={{ color: "hsl(var(--success))" }}>
                Communiquez le code de confirmation uniquement au livreur lors de la remise.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
