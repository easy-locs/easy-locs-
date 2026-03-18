/**
 * PresenceMobilitySelector — Map presence mode & mobility type picker for listings.
 */
import { Label } from "@/components/ui/label";
import { MapPin, Orbit, Store, Truck, Wrench, Car } from "lucide-react";

export type PresenceMode = "pin" | "orbit";
export type MobilityType = "fixed_store" | "mobile_seller" | "mobile_service" | "driver";

const PRESENCE_OPTIONS = [
  {
    value: "pin" as PresenceMode,
    label: "Pin",
    desc: "Fixed location on map",
    icon: MapPin,
    examples: "Shops, restaurants, hotels, offices",
  },
  {
    value: "orbit" as PresenceMode,
    label: "Orbit",
    desc: "Mobile / dynamic presence",
    icon: Orbit,
    examples: "Delivery, mobile services, drivers",
  },
];

const MOBILITY_OPTIONS = [
  { value: "fixed_store" as MobilityType, label: "Fixed Store", icon: Store, emoji: "🏪" },
  { value: "mobile_seller" as MobilityType, label: "Mobile Seller", icon: Truck, emoji: "🛒" },
  { value: "mobile_service" as MobilityType, label: "Mobile Service", icon: Wrench, emoji: "🔧" },
  { value: "driver" as MobilityType, label: "Driver", icon: Car, emoji: "🚗" },
];

interface Props {
  presenceMode: PresenceMode;
  mobilityType: MobilityType;
  onPresenceModeChange: (v: PresenceMode) => void;
  onMobilityTypeChange: (v: MobilityType) => void;
}

export default function PresenceMobilitySelector({
  presenceMode,
  mobilityType,
  onPresenceModeChange,
  onMobilityTypeChange,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Presence Mode */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">
          📍 How should your listing appear on the map?
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {PRESENCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = presenceMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPresenceModeChange(opt.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  selected
                    ? "border-accent bg-accent/10 shadow-sm"
                    : "border-border/50 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selected ? "bg-accent/20 text-accent" : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-sm font-semibold ${selected ? "text-accent" : "text-foreground"}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                <span className="text-[9px] text-muted-foreground/70 italic">{opt.examples}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobility Type */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">
          🏷️ What type of activity is this?
        </Label>
        <div className="flex flex-wrap gap-2">
          {MOBILITY_OPTIONS.map((opt) => {
            const selected = mobilityType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onMobilityTypeChange(opt.value)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selected
                    ? "border-accent bg-accent/10 text-accent shadow-sm"
                    : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span>{opt.emoji}</span> {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
