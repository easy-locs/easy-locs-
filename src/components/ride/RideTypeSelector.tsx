/**
 * RideTypeSelector — Premium ride tier cards with fare display.
 */
import { Users, Clock } from "lucide-react";
import { motion } from "framer-motion";

export interface RideType {
  id: string;
  label: string;
  icon: string;
  eta: string;
  multiplier: number;
  seats: number;
}

export const RIDE_TYPES: RideType[] = [
  { id: "standard", label: "Standard", icon: "🚗", eta: "4 min", multiplier: 1, seats: 4 },
  { id: "comfort", label: "Comfort", icon: "🚙", eta: "6 min", multiplier: 1.4, seats: 4 },
  { id: "xl", label: "XL", icon: "🚐", eta: "8 min", multiplier: 1.8, seats: 6 },
  { id: "moto", label: "Moto", icon: "🏍️", eta: "2 min", multiplier: 0.7, seats: 1 },
];

interface Props {
  selected: RideType;
  onSelect: (type: RideType) => void;
  getFare: (type: RideType) => string;
}

export default function RideTypeSelector({ selected, onSelect, getFare }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Choose your ride</p>
      <div className="grid grid-cols-2 gap-2">
        {RIDE_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => onSelect(type)}
            className={`p-3 rounded-2xl border text-left active:scale-[0.97] transition-all ${
              selected.id === type.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/15 bg-card hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">{type.icon}</span>
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" />{type.seats}
              </span>
            </div>
            <p className="text-xs font-bold text-foreground">{type.label}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />{type.eta}
              </span>
              <span className="text-xs font-bold text-primary">{getFare(type)}</span>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
