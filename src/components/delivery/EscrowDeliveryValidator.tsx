/**
 * EscrowDeliveryValidator — Ties escrow payment to delivery confirmation.
 * Shows escrow status, confirmation code entry, and auto-release on validation.
 * PASS GO LIVE: Delivery Radar Upgrade.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Unlock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  jobId: string;
  jobStatus: string;
  escrowStatus?: string;
  escrowAmount?: number;
  escrowCurrency?: string;
  confirmationCode?: string;
  role: "seller" | "buyer" | "driver";
  onStatusChange?: () => void;
}

const STATUS_CONFIG: Record<string, { icon: typeof Lock; color: string; label: string }> = {
  held: { icon: Lock, color: "hsl(var(--warning))", label: "Fonds bloqués" },
  released: { icon: Unlock, color: "hsl(var(--success))", label: "Fonds libérés" },
  refunded: { icon: AlertTriangle, color: "hsl(var(--destructive))", label: "Remboursé" },
  pending: { icon: Shield, color: "hsl(var(--muted-foreground))", label: "En attente" },
};

export default function EscrowDeliveryValidator({
  jobId,
  jobStatus,
  escrowStatus = "pending",
  escrowAmount,
  escrowCurrency = "EUR",
  confirmationCode,
  role,
  onStatusChange,
}: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const statusCfg = STATUS_CONFIG[escrowStatus] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  const handleValidateDelivery = useCallback(async () => {
    if (!code.trim()) {
      toast.error("Entrez le code de confirmation");
      return;
    }

    if (confirmationCode && code.trim() !== confirmationCode) {
      toast.error("Code incorrect");
      return;
    }

    setLoading(true);
    try {
      // Update job status to completed
      const { error: jobError } = await supabase
        .from("delivery_jobs")
        .update({
          status: "completed",
          delivered_at: new Date().toISOString(),
        } as any)
        .eq("id", jobId);

      if (jobError) throw jobError;

      // Release escrow
      const { error: escrowError } = await supabase
        .from("escrow_payments")
        .update({
          status: "released",
          released_at: new Date().toISOString(),
          release_reason: "delivery_confirmed",
        } as any)
        .eq("job_id", jobId)
        .eq("status", "held");

      if (escrowError) throw escrowError;

      toast.success("Livraison confirmée ! Fonds libérés au livreur.");
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation");
    } finally {
      setLoading(false);
    }
  }, [code, confirmationCode, jobId, onStatusChange]);

  const handleRefund = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("escrow_payments")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
          refund_reason: "delivery_issue",
        } as any)
        .eq("job_id", jobId)
        .eq("status", "held");

      if (error) throw error;

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
          {escrowAmount && (
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
            Code de confirmation (6 chiffres)
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            maxLength={6}
            className="text-center text-lg font-mono tracking-[0.3em] h-12"
            inputMode="numeric"
          />
          <Button
            onClick={handleValidateDelivery}
            disabled={loading || code.length < 4}
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
