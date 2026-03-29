/**
 * MultiStopRoutePanel — Multi-point deliveries with route optimization.
 * PASS81-Q: Multi-stop Routes
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Trash2, ArrowUpDown, Loader2, Route, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as deliveryRepo from "@/repositories/delivery.repository";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Stop {
  id: string;
  address: string;
  type: "pickup" | "dropoff";
  completed: boolean;
  description?: string;
}

interface Props {
  orgId: string;
  className?: string;
}

export default function MultiStopRoutePanel({ orgId, className }: Props) {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([
    { id: crypto.randomUUID(), address: "", type: "pickup", completed: false },
    { id: crypto.randomUUID(), address: "", type: "dropoff", completed: false },
  ]);
  const [packageDesc, setPackageDesc] = useState("");
  const [fee, setFee] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const addStop = () => {
    setStops(prev => [...prev, { id: crypto.randomUUID(), address: "", type: "dropoff", completed: false }]);
    setOptimized(false);
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) return;
    setStops(prev => prev.filter(s => s.id !== id));
    setOptimized(false);
  };

  const updateStop = (id: string, field: keyof Stop, value: string) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    setOptimized(false);
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= stops.length) return;
    const newStops = [...stops];
    [newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]];
    setStops(newStops);
  };

  const optimizeRoute = useCallback(() => {
    // Simple optimization: keep first pickup, sort remaining by type (pickups first, then dropoffs)
    const first = stops[0];
    const rest = stops.slice(1);
    const pickups = rest.filter(s => s.type === "pickup");
    const dropoffs = rest.filter(s => s.type === "dropoff");
    setStops([first, ...pickups, ...dropoffs]);
    setOptimized(true);
    toast.success("Itinéraire optimisé !");
  }, [stops]);

  const handleCreateRoute = async () => {
    if (!user) return;
    const validStops = stops.filter(s => s.address.trim());
    if (validStops.length < 2) {
      toast.error("Au moins 2 adresses requises");
      return;
    }

    setSubmitting(true);
    try {
      // Create individual jobs for each pickup→dropoff pair
      const pickups = validStops.filter(s => s.type === "pickup");
      const dropoffs = validStops.filter(s => s.type === "dropoff");

      if (pickups.length === 0 || dropoffs.length === 0) {
        toast.error("Il faut au moins un point de collecte et un point de livraison");
        setSubmitting(false);
        return;
      }

      const feePerStop = Math.round((fee / dropoffs.length) * 100) / 100;
      const jobs = [];

      for (const dropoff of dropoffs) {
        const nearestPickup = pickups[0]; // Use first pickup as base
        jobs.push({
          org_id: orgId,
          seller_id: user.id,
          pickup_address: nearestPickup.address,
          dropoff_address: dropoff.address,
          package_description: packageDesc || `Multi-stop: ${dropoff.description || dropoff.address}`,
          delivery_fee: feePerStop,
          currency: "EUR",
          priority: "standard" as const,
          status: "pending" as const,
          notes: `Route multi-stops (${validStops.length} arrêts)`,
        });
      }

      await deliveryRepo.insertMobilityJobs(jobs);

      toast.success(`${jobs.length} missions créées !`);
      // Reset
      setStops([
        { id: crypto.randomUUID(), address: "", type: "pickup", completed: false },
        { id: crypto.randomUUID(), address: "", type: "dropoff", completed: false },
      ]);
      setPackageDesc("");
      setFee(10);
    } catch (err: any) {
      toast.error(err.message || "Erreur création route");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Route className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          Route multi-stops
        </h3>
        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
          {stops.length} arrêts
        </span>
      </div>

      {/* Stops list */}
      <div className="space-y-2">
        {stops.map((stop, i) => (
          <motion.div key={stop.id} layout
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveStop(i, -1)} disabled={i === 0}
                className="disabled:opacity-20" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
              style={{
                background: stop.type === "pickup" ? "hsl(var(--info) / 0.15)" : "hsl(var(--success) / 0.15)",
                color: stop.type === "pickup" ? "hsl(var(--info))" : "hsl(var(--success))",
              }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex gap-1">
                <select value={stop.type} onChange={e => updateStop(stop.id, "type", e.target.value)}
                  className="text-[9px] rounded px-1 py-0.5 border-none"
                  style={{ background: "hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text-dim))" }}>
                  <option value="pickup">Collecte</option>
                  <option value="dropoff">Livraison</option>
                </select>
              </div>
              <Input value={stop.address} onChange={e => updateStop(stop.id, "address", e.target.value)}
                placeholder="Adresse..." className="h-7 text-[11px]"
                style={{ background: "hsl(var(--hud-border) / 0.04)" }} />
            </div>
            {stops.length > 2 && (
              <button onClick={() => removeStop(stop.id)} style={{ color: "hsl(var(--destructive) / 0.5)" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addStop} className="text-[10px] h-7 flex-1">
          <Plus className="h-3 w-3 mr-1" /> Ajouter un arrêt
        </Button>
        <Button size="sm" variant="outline" onClick={optimizeRoute} className="text-[10px] h-7 flex-1"
          style={{ borderColor: optimized ? "hsl(var(--success) / 0.3)" : undefined, color: optimized ? "hsl(var(--success))" : undefined }}>
          {optimized ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <ArrowUpDown className="h-3 w-3 mr-1" />}
          {optimized ? "Optimisé" : "Optimiser"}
        </Button>
      </div>

      {/* Details */}
      <div className="space-y-2 rounded-lg p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
            <Input value={packageDesc} onChange={e => setPackageDesc(e.target.value)} placeholder="Colis multiples..."
              className="h-7 text-[11px]" style={{ background: "hsl(var(--hud-border) / 0.04)" }} />
          </div>
          <div className="w-20">
            <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Frais total €</Label>
            <Input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} min={0} step={0.5}
              className="h-7 text-[11px]" style={{ background: "hsl(var(--hud-border) / 0.04)" }} />
          </div>
        </div>
      </div>

      <Button size="sm" onClick={handleCreateRoute} disabled={submitting || stops.filter(s => s.address).length < 2}
        className="w-full text-xs h-9" style={{ background: "hsl(var(--hud-cyan))", color: "#fff" }}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <><Route className="h-3.5 w-3.5 mr-1.5" /> Créer la route ({stops.filter(s => s.type === "dropoff" && s.address).length} missions)</>
        )}
      </Button>
    </div>
  );
}
