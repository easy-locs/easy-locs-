/**
 * EscrowDeliveryValidator — Ties escrow payment to delivery confirmation.
 * Shows escrow status, confirmation code entry, and auto-release on validation.
 * 
 * HARDENED: All mutations go through dispatch-delivery edge function (service_role).
 * - Mandatory 6-digit confirmation code
 * - GPS proximity enforcement (≤500m from dropoff)
 * - GPS accuracy check (≤100m)
 * - Server-side escrow release (no direct DB mutation)
 */
import { useState, useCallback, useEffect } from "react";
import * as escrowRepo from "@/repositories/escrow.repository";
import { Shield, Lock, Unlock, CheckCircle, AlertTriangle, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { haversineKm } from "@/lib/geo/distance";

interface Props {
  jobId: string;
  jobStatus: string;
  escrowStatus?: string;
  escrowAmount?: number;
  escrowCurrency?: string;
  confirmationCode?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  role: "seller" | "buyer" | "driver";
  onStatusChange?: () => void;
}

const STATUS_CONFIG: Record<string, { icon: typeof Lock; color: string; label: string }> = {
  held: { icon: Lock, color: "hsl(var(--warning))", label: "Fonds bloqués" },
  released: { icon: Unlock, color: "hsl(var(--success))", label: "Fonds libérés" },
  refunded: { icon: AlertTriangle, color: "hsl(var(--destructive))", label: "Remboursé" },
  pending: { icon: Shield, color: "hsl(var(--muted-foreground))", label: "En attente" },
};

const MAX_PROXIMITY_KM = 0.5;
const MAX_GPS_ACCURACY_M = 100;

export default function EscrowDeliveryValidator({
  jobId,
  jobStatus,
  escrowStatus: initialEscrowStatus,
  escrowAmount,
  escrowCurrency = "EUR",
  confirmationCode,
  dropoffLat,
  dropoffLng,
  role,
  onStatusChange,
}: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [escrowStatus, setEscrowStatus] = useState(initialEscrowStatus || "pending");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "checking" | "ok" | "too_far" | "low_accuracy" | "unavailable">("idle");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  // Fetch real escrow status from server
  useEffect(() => {
    async function fetchEscrow() {
      try {
        const data = await escrowRepo.fetchEscrowStatus(jobId);
        if (data?.escrow) {
          setEscrowStatus(data.escrow.status);
        }
      } catch { /* use prop fallback */ }
    }
    fetchEscrow();
  }, [jobId]);

  const statusCfg = STATUS_CONFIG[escrowStatus] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  // GPS proximity check
  const checkGpsProximity = useCallback((): Promise<boolean> => {
    return new Promise(async (resolve) => {
      // If no dropoff coordinates, skip GPS check
      if (!dropoffLat || !dropoffLng) {
        setGpsStatus("ok");
        resolve(true);
        return;
      }

      setGpsStatus("checking");

      try {
        const { getCurrentPositionHighAccuracy } = await import("@/lib/location/geolocation");
        const pos = await getCurrentPositionHighAccuracy();
        const { useLocationStore } = await import("@/stores/locationStore");
        useLocationStore.getState().setCurrentLocation(pos);

        setCurrentCoords({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy });

        if (pos.accuracy > MAX_GPS_ACCURACY_M) {
          setGpsStatus("low_accuracy");
          toast.error(`Précision GPS insuffisante (${Math.round(pos.accuracy)}m). Minimum requis : ${MAX_GPS_ACCURACY_M}m`);
          resolve(false);
          return;
        }

        const distKm = haversineKm(pos.lat, pos.lng, dropoffLat, dropoffLng);
        if (distKm > MAX_PROXIMITY_KM) {
          setGpsStatus("too_far");
          toast.error(`Vous êtes à ${(distKm * 1000).toFixed(0)}m du point de livraison. Maximum autorisé : ${MAX_PROXIMITY_KM * 1000}m`);
          resolve(false);
          return;
        }

        setGpsStatus("ok");
        resolve(true);
      } catch {
        setGpsStatus("unavailable");
        toast.error("Impossible d'obtenir la position GPS");
        resolve(false);
      }
    });
  }, [dropoffLat, dropoffLng]);

  const handleValidateDelivery = useCallback(async () => {
    // Mandatory 6-digit code
    if (code.length !== 6) {
      toast.error("Le code de confirmation doit contenir exactement 6 chiffres");
      return;
    }

    // Client-side code pre-check (server will also validate)
    if (confirmationCode && code.trim() !== confirmationCode) {
      toast.error("Code incorrect");
      return;
    }

    // GPS proximity check for driver role
    if (role === "driver") {
      const gpsOk = await checkGpsProximity();
      if (!gpsOk) return;
    }

    setLoading(true);
    try {
      // Step 1: Confirm delivery via edge function (server-side validation)
      await escrowRepo.confirmDelivery(jobId, code, {
        lat: currentCoords?.lat,
        lng: currentCoords?.lng,
        accuracy: currentCoords?.accuracy,
      });

      // Step 2: Release escrow via edge function
      const escrowData = await escrowRepo.releaseEscrow(jobId, "delivery_confirmed");
      if (escrowData?.error) {
        // Non-blocking: escrow may not exist for all jobs
        console.warn("[escrow] Release note:", escrowData.error);
      }

      setEscrowStatus("released");
      toast.success("Livraison confirmée ! Fonds libérés au livreur.");
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation");
    } finally {
      setLoading(false);
    }
  }, [code, confirmationCode, jobId, onStatusChange, role, checkGpsProximity, currentCoords]);

  const handleRefund = useCallback(async () => {
    setLoading(true);
    try {
      await escrowRepo.refundEscrow(jobId, "delivery_issue");

      setEscrowStatus("refunded");
      toast.success("Fonds remboursés.");
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur de remboursement");
    } finally {
      setLoading(false);
    }
  }, [jobId, onStatusChange]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-accent" />
        <h4 className="text-xs font-bold text-foreground">Escrow & Validation</h4>
      </div>

      {/* Escrow status */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{ background: `${statusCfg.color}10`, border: `1px solid ${statusCfg.color}25` }}
      >
        <StatusIcon className="h-5 w-5 flex-shrink-0" style={{ color: statusCfg.color }} />
        <div className="flex-1">
          <p className="text-xs font-semibold" style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </p>
          {escrowAmount != null && escrowAmount > 0 && (
            <p className="text-lg font-black text-foreground">
              {escrowAmount.toFixed(2)} {escrowCurrency}
            </p>
          )}
        </div>
      </div>

      {/* Confirmation code entry (buyer/driver validates delivery) */}
      {escrowStatus === "held" && (role === "buyer" || role === "driver") && (
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Code de confirmation (6 chiffres — obligatoire)
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            maxLength={6}
            className="text-center text-lg font-mono tracking-[0.3em] h-12"
            inputMode="numeric"
          />

          {/* GPS status indicator for driver */}
          {role === "driver" && dropoffLat && dropoffLng && (
            <div className="flex items-center gap-2 text-[10px]">
              <MapPin className="h-3 w-3" style={{
                color: gpsStatus === "ok" ? "hsl(var(--success))" :
                       gpsStatus === "too_far" || gpsStatus === "low_accuracy" ? "hsl(var(--destructive))" :
                       "hsl(var(--muted-foreground))"
              }} />
              <span className="text-muted-foreground">
                {gpsStatus === "idle" && "Vérification GPS au submit"}
                {gpsStatus === "checking" && "Vérification GPS..."}
                {gpsStatus === "ok" && `Position vérifiée${currentCoords ? ` (±${Math.round(currentCoords.accuracy)}m)` : ""}`}
                {gpsStatus === "too_far" && "Trop loin du point de livraison"}
                {gpsStatus === "low_accuracy" && "Précision GPS insuffisante"}
                {gpsStatus === "unavailable" && "GPS non disponible"}
              </span>
            </div>
          )}

          <Button
            onClick={handleValidateDelivery}
            disabled={loading || code.length !== 6}
            className="w-full min-h-[44px] gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Confirmer la livraison
          </Button>
        </div>
      )}

      {/* Seller can refund if issue */}
      {escrowStatus === "held" && role === "seller" && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefund}
            disabled={loading}
            className="flex-1 min-h-[44px] text-xs gap-1"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
            Rembourser
          </Button>
        </div>
      )}

      {/* Completed state */}
      {escrowStatus === "released" && (
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "hsl(var(--success))" }}>
          <CheckCircle className="h-4 w-4" />
          Livraison validée — fonds transférés
        </div>
      )}
    </div>
  );
}
