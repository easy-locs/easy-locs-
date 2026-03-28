/**
 * DriverSearchPanel — Extracted from SellerLogisticsPanel.
 * Single responsibility: search nearby drivers + assign to job.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSellerDelivery, type NearbyDriver } from "@/hooks/useSellerDelivery";

interface Props {
  jobId: string;
  onAssign: (driverId: string) => Promise<void>;
  onClose: () => void;
}

export default function DriverSearchPanel({ jobId, onAssign, onClose }: Props) {
  const { findDrivers } = useSellerDelivery();
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const result = await findDrivers(jobId);
      setDrivers(result);
      setSearched(true);
      if (result.length === 0) toast("Aucun chauffeur disponible à proximité");
    } catch { toast.error("Erreur de recherche"); }
    finally { setSearching(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-2 pt-2">
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 text-xs h-8" onClick={handleSearch} disabled={searching}
          style={{ background: "hsl(var(--info) / 0.15)", color: "hsl(var(--info))" }}>
          <Search className="h-3 w-3 mr-1" /> {searching ? "Recherche…" : "Chercher chauffeurs"}
        </Button>
        <Button size="sm" variant="ghost" className="text-xs h-8" onClick={onClose}
          style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>✕</Button>
      </div>

      {searched && drivers.length === 0 && (
        <p className="text-[10px] text-center py-3" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
          Aucun chauffeur trouvé dans un rayon de 15 km
        </p>
      )}

      {drivers.map(d => (
        <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--info) / 0.1)" }}>
            <Truck className="h-3.5 w-3.5" style={{ color: "hsl(var(--info))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
              {d.vehicle_type} • {d.distance_km} km
            </p>
            <div className="flex items-center gap-2">
              {d.avg_rating && <span className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>⭐ {d.avg_rating.toFixed(1)}</span>}
              {d.total_completed != null && <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{d.total_completed} livraisons</span>}
            </div>
          </div>
          <Button size="sm" className="text-[10px] h-7 px-3" onClick={() => onAssign(d.user_id)}
            style={{ background: "hsl(var(--success))", color: "#fff" }}>
            Assigner
          </Button>
        </div>
      ))}
    </motion.div>
  );
}
