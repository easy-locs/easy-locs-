/**
 * PackageSizePicker — Visual package size selector for delivery creation.
 * PASS GO LIVE: Delivery Radar Upgrade.
 */
import { PACKAGE_SIZES, type PackageSize } from "@/lib/delivery-pricing";
import { cn } from "@/lib/utils";

interface Props {
  value: PackageSize;
  onChange: (size: PackageSize) => void;
}

export default function PackageSizePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PACKAGE_SIZES.map(size => {
        const active = value === size.value;
        return (
          <button
            key={size.value}
            type="button"
            onClick={() => onChange(size.value)}
            className={cn(
              "flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all min-h-[44px]",
              active
                ? "border-accent bg-accent/10"
                : "border-border bg-card hover:border-accent/40"
            )}
          >
            <span className="text-xl">{size.icon}</span>
            <span className={cn("text-[10px] font-semibold", active ? "text-accent" : "text-muted-foreground")}>
              {size.label}
            </span>
            <span className="text-[8px] text-muted-foreground">
              ≤ {size.maxKg}kg • ×{size.multiplier}
            </span>
          </button>
        );
      })}
    </div>
  );
}
