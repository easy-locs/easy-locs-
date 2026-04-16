/**
 * CustomerTrackingPortal — NNN. Customer Tracking Portal
 * Real-time package tracking with ETA, notifications, and post-delivery feedback.
 * PASS93-NNN
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MapPin, Clock, Star, MessageSquare, Bell, CheckCircle2, Truck, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLiveTrackings, useDeliveryShipments, useInsertMutation } from "@/hooks/useDeliveryData";
import { toast } from "sonner";

export default function CustomerTrackingPortal({ orgId }: { orgId: string }) {
  const { data: trackings = [], isLoading: loadingTrackings } = useLiveTrackings(orgId);
  const { data: shipments = [], isLoading: loadingShipments } = useDeliveryShipments(orgId);
  const insertRating = useInsertMutation("delivery_ratings");

  const packages: any[] = trackings.length > 0 ? trackings : shipments;
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (loadingTrackings || loadingShipments) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  if (packages.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Suivi Colis</h3>
        </div>
        <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun colis à suivre</div>
      </div>
    );
  }

  const currentPkgId = selectedPkg || packages[0]?.id;
  const pkg = packages.find((p: any) => p.id === currentPkgId) || packages[0];
  const isDelivered = pkg?.status === "delivered";

  const submitFeedback = () => {
    if (rating === 0) return;
    insertRating.mutate({
      org_id: orgId,
      rating,
      comment,
      shipment_id: pkg?.id,
    } as any, {
      onSuccess: () => {
        toast.success("Merci pour votre évaluation !");
        setShowFeedback(false);
        setRating(0);
        setComment("");
      },
      onError: () => toast.error("Erreur lors de l'envoi"),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Navigation className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Suivi Colis</h3>
      </div>

      {/* Package selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {packages.map((p: any) => (
          <button key={p.id} onClick={() => { setSelectedPkg(p.id); setShowFeedback(false); }}
            className="shrink-0 rounded-lg px-3 py-2 text-left transition-all"
            style={{
              background: currentPkgId === p.id ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-surface))",
              border: `1px solid ${currentPkgId === p.id ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.06)"}`,
            }}>
            <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{p.tracking_code || p.tracking_number || `#${String(p.id).slice(0, 8)}`}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{p.description || p.status || ""}</p>
          </button>
        ))}
      </div>

      {/* ETA / Status banner */}
      <div className="rounded-xl p-3 text-center" style={{
        background: isDelivered ? "hsl(var(--success) / 0.06)" : "hsl(var(--hud-cyan) / 0.06)",
        border: `1px solid ${isDelivered ? "hsl(var(--success) / 0.12)" : "hsl(var(--hud-cyan) / 0.12)"}`,
      }}>
        {isDelivered ? (
          <>
            <p className="text-lg">🏁</p>
            <p className="text-xs font-bold mt-1" style={{ color: "hsl(var(--success))" }}>Livré</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {pkg.driver_name ? `Par ${pkg.driver_name}` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg">🚚</p>
            <p className="text-xs font-bold mt-1" style={{ color: "hsl(var(--hud-cyan))" }}>
              {pkg.eta ? `Arrivée estimée : ${pkg.eta}` : `Statut: ${pkg.status || "en cours"}`}
            </p>
            <p className="text-[0.625rem] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
              {pkg.driver_name ? `🚗 ${pkg.driver_name}` : ""}
              {pkg.driver_vehicle ? ` • ${pkg.driver_vehicle}` : ""}
            </p>
          </>
        )}
      </div>

      {/* Route */}
      <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--success))" }} />
          <div className="w-0.5 h-6" style={{ background: "hsl(var(--hud-border) / 0.15)" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: isDelivered ? "hsl(var(--success))" : "hsl(var(--hud-cyan))" }} />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>RETRAIT</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text))" }}>{pkg.origin || pkg.pickup_address || pkg.from_address || "—"}</p>
          </div>
          <div>
            <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>LIVRAISON</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text))" }}>{pkg.destination || pkg.delivery_address || pkg.to_address || "—"}</p>
          </div>
        </div>
      </div>

      {/* Status info */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Statut actuel</p>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[0.625rem]"
            style={{
              background: isDelivered ? "hsl(var(--success) / 0.12)" : "hsl(var(--hud-cyan) / 0.12)",
              border: `1.5px solid ${isDelivered ? "hsl(var(--success))" : "hsl(var(--hud-cyan))"}`,
            }}>
            {isDelivered ? "🏁" : "🚚"}
          </div>
          <p className="text-[0.625rem] font-semibold" style={{ color: isDelivered ? "hsl(var(--success))" : "hsl(var(--hud-cyan))" }}>
            {isDelivered ? "Livré" : pkg.status || "En cours"}
          </p>
          {pkg.updated_at && (
            <span className="text-[0.625rem] ml-auto" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
              {new Date(pkg.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Feedback section for delivered packages */}
      {isDelivered && !showFeedback && (
        <Button size="sm" className="w-full text-xs h-9" onClick={() => setShowFeedback(true)}
          style={{ background: "hsl(var(--warning) / 0.12)", color: "hsl(var(--warning))" }}>
          <Star className="h-3.5 w-3.5 mr-1" /> Évaluer la livraison
        </Button>
      )}

      <AnimatePresence>
        {showFeedback && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl p-3 space-y-3 overflow-hidden"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--warning) / 0.12)" }}>
            <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Évaluez la livraison</p>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} className="text-lg transition-transform hover:scale-110">
                  {s <= rating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
            <Textarea placeholder="Un commentaire ? (optionnel)" value={comment} onChange={e => setComment(e.target.value)}
              rows={2} className="text-xs"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs h-8" disabled={rating === 0} onClick={submitFeedback}
                style={{ background: "hsl(var(--success))", color: "#fff" }}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Envoyer
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setShowFeedback(false)}
                style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Annuler</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
