import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, Car, Tag, Users, ShoppingBag, MapPin } from "lucide-react";

export type RadarLayer = "restaurants" | "drivers" | "deals" | "friends" | "c2c" | "all";

interface LayerConfig {
  id: RadarLayer;
  label: string;
  icon: typeof MapPin;
  color: string;
}

const LAYERS: LayerConfig[] = [
  { id: "all", label: "All", icon: MapPin, color: "hsl(var(--brand-primary))" },
  { id: "restaurants", label: "Food", icon: UtensilsCrossed, color: "hsl(25 95% 53%)" },
  { id: "drivers", label: "Drivers", icon: Car, color: "hsl(210 100% 55%)" },
  { id: "deals", label: "Deals", icon: Tag, color: "hsl(340 82% 52%)" },
  { id: "friends", label: "Friends", icon: Users, color: "hsl(160 84% 39%)" },
  { id: "c2c", label: "C2C", icon: ShoppingBag, color: "hsl(270 70% 55%)" },
];

interface SmartLayerToggleProps {
  activeLayers: Set<RadarLayer>;
  onToggle: (layer: RadarLayer) => void;
  className?: string;
}

function SmartLayerToggleInner({ activeLayers, onToggle, className = "" }: SmartLayerToggleProps) {
  const handleToggle = useCallback(
    (layer: RadarLayer) => {
      onToggle(layer);
    },
    [onToggle],
  );

  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar px-1 py-1 ${className}`}>
      {LAYERS.map((layer) => {
        const isActive = activeLayers.has(layer.id) || (layer.id === "all" && activeLayers.size === 0);
        const Icon = layer.icon;

        return (
          <motion.button
            key={layer.id}
            onClick={() => handleToggle(layer.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              isActive
                ? "text-white shadow-sm"
                : "bg-background/80 text-foreground/60 border border-border/20 hover:bg-background"
            }`}
            style={isActive ? { backgroundColor: layer.color } : undefined}
            whileTap={{ scale: 0.93 }}
            layout
          >
            <Icon className="h-3.5 w-3.5" />
            {layer.label}
          </motion.button>
        );
      })}
    </div>
  );
}

const SmartLayerToggle = memo(SmartLayerToggleInner);
export default SmartLayerToggle;
