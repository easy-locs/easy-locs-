/**
 * GhostListingsSection — Displays unclaimed "Coming Soon" merchant cards.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchGhostListings, type DiscoveredMerchant } from "@/lib/engines/auto-acquisition-engine";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function GhostListingsSection({ city }: { city?: string }) {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<DiscoveredMerchant[]>([]);

  useEffect(() => {
    fetchGhostListings(city, 6).then(setMerchants);
  }, [city]);

  if (!merchants.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-foreground">Coming Soon</h3>
        <span className="text-[10px] text-muted-foreground">{merchants.length} shops</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {merchants.map((m, i) => (
          <motion.button
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/claim-shop/${m.id}`)}
            className="shrink-0 w-[160px] rounded-2xl bg-card border border-border/30 overflow-hidden text-left active:scale-[0.97] transition-transform"
          >
            <div className="h-20 bg-muted relative">
              {m.cover_url ? (
                <img src={m.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl bg-muted/50">🏪</div>
              )}
              <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/90 text-white">
                Coming Soon
              </span>
            </div>
            <div className="p-2.5 space-y-1">
              <p className="text-xs font-bold text-foreground truncate">{m.name}</p>
              <div className="flex items-center gap-1.5">
                {m.city && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5" /> {m.city}
                  </span>
                )}
                {m.rating && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                    <Star className="w-2.5 h-2.5 fill-current" /> {Number(m.rating).toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                Claim <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
