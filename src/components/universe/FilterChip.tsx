/**
 * FilterChip — Reusable chip for filter bars in universe hubs.
 */
import { cn } from "@/lib/utils";

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export default function FilterChip({ label, active, onClick, icon }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-semibold whitespace-nowrap border transition-all shrink-0",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card text-muted-foreground border-border/30 hover:border-border/50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
