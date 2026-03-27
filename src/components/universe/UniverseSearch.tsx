/**
 * UniverseSearch — Premium search bar with optional location context.
 */
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UniverseSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  /** Show clear button when value exists */
  clearable?: boolean;
}

export default function UniverseSearch({
  placeholder = "Search…",
  value,
  onChange,
  className,
  clearable = true,
}: UniverseSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="min-w-0 h-12 pl-11 pr-10 rounded-2xl bg-card border-border/30 text-sm leading-normal shadow-sm"
      />
      {clearable && value && (
        <button
          onClick={() => onChange?.("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center"
          aria-label="Clear search"
        >
          <X className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
