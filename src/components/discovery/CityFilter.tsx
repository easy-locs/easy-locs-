/**
 * CityFilter — Quick city filter chips for UAE discovery.
 */
import { cn } from "@/lib/utils";

const UAE_CITIES = [
  { label: "All Cities", value: null as string | null },
  { label: "Dubai", value: "Dubai" },
  { label: "Abu Dhabi", value: "Abu Dhabi" },
  { label: "Sharjah", value: "Sharjah" },
  { label: "Ajman", value: "Ajman" },
  { label: "RAK", value: "Ras Al Khaimah" },
];

interface CityFilterProps {
  value: string | null;
  onChange: (city: string | null) => void;
  className?: string;
}

export default function CityFilter({ value, onChange, className }: CityFilterProps) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto scrollbar-none pb-1", className)}>
      {UAE_CITIES.map((c) => (
        <button
          key={c.label}
          onClick={() => onChange(c.value)}
          className={cn(
            "px-2.5 py-1 rounded-full text-2xs font-semibold whitespace-nowrap border transition-all shrink-0",
            (value === c.value)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border/30 hover:border-border/50"
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
