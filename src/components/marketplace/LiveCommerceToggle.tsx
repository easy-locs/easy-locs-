/**
 * LiveCommerceToggle — Toggle live status for provider storefront.
 * Shows elapsed time, broadcasts status change via platform bus.
 * PASS55 Block E2: Seller Deep
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Radio, Clock, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface LiveCommerceToggleProps {
  providerId: string;
  isLive: boolean;
  liveSince: string | null;
  onStatusChange?: (isLive: boolean) => void;
}

function formatElapsed(since: string): string {
  const diff = Date.now() - new Date(since).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

export default function LiveCommerceToggle({ providerId, isLive, liveSince, onStatusChange }: LiveCommerceToggleProps) {
  const [live, setLive] = useState(isLive);
  const [since, setSince] = useState(liveSince);
  const [elapsed, setElapsed] = useState("");
  const [toggling, setToggling] = useState(false);

  // Update elapsed timer
  useEffect(() => {
    if (!live || !since) { setElapsed(""); return; }
    const update = () => setElapsed(formatElapsed(since));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [live, since]);

  const toggle = useCallback(async () => {
    setToggling(true);
    haptic("medium");

    const newLive = !live;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("marketplace_providers")
      .update({
        is_live: newLive,
        live_since: newLive ? now : null,
      } as any)
      .eq("id", providerId);

    if (error) {
      toast.error("Erreur lors du changement de statut");
      setToggling(false);
      return;
    }

    setLive(newLive);
    setSince(newLive ? now : null);
    onStatusChange?.(newLive);

    platformBus.emit(
      newLive ? "marketplace:provider_went_live" : "marketplace:provider_went_offline",
      { providerId, timestamp: now },
      "marketplace"
    );

    toast.success(newLive ? "🔴 Vous êtes en direct !" : "Vous êtes hors ligne");
    setToggling(false);
  }, [live, providerId, onStatusChange]);

  return (
    <div
      className="rounded-xl border p-4 space-y-3 transition-all"
      style={{
        background: live ? "hsl(0 84% 60% / 0.04)" : "hsl(var(--card))",
        borderColor: live ? "hsl(0 84% 60% / 0.2)" : "hsl(var(--border))",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {live ? (
            <motion.div
              className="relative"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Radio className="w-4 h-4" style={{ color: "hsl(0 84% 60%)" }} />
            </motion.div>
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {live ? "En direct" : "Hors ligne"}
            </p>
            {live && since && (
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  En direct depuis {elapsed}
                </span>
              </div>
            )}
          </div>
        </div>

        <Switch
          checked={live}
          onCheckedChange={() => toggle()}
          disabled={toggling}
          className="data-[state=checked]:bg-red-500"
        />
      </div>

      {/* Info */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {live
          ? "Votre vitrine est marquée comme active. Les clients voient un indicateur « LIVE » et vous êtes prioritaire dans les résultats."
          : "Activez le mode direct pour signaler votre disponibilité immédiate et gagner en visibilité."}
      </p>

      {/* Live pulse indicator */}
      {live && (
        <div className="flex items-center gap-2 pt-1">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ background: "hsl(0 84% 60%)" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] font-medium" style={{ color: "hsl(0 84% 60%)" }}>
            Diffusion active
          </span>
        </div>
      )}
    </div>
  );
}
