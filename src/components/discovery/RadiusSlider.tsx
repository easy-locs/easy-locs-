/**
 * RadiusSlider — Booking.com-style search radius control.
 * Shows radius presets + slider for custom km range.
 */
import { MapPin } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "1 km", value: 1 },
  { label: "3 km", value: 3 },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "All", value: null as number | null },
];

interface RadiusSliderProps {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
}

export default function RadiusSlider({ value, onChange, className }: RadiusSliderProps) {
  const sliderValue = value ?? 50;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <MapPin className="h-3 w-3" />
        Search radius: {value ? `${value} km` : "Unlimited"}
      </div>

      {/* Preset chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-2xs font-semibold whitespace-nowrap border transition-all shrink-0",
              (value === p.value || (p.value === null && value === null))
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/30 hover:border-border/50"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom slider */}
      <Slider
        min={1}
        max={50}
        step={1}
        value={[sliderValue]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}
