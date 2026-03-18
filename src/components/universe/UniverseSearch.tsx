/**
 * UniverseSearch — Reusable search bar for universe hubs.
 */
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UniverseSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export default function UniverseSearch({
  placeholder = "Search…",
  value,
  onChange,
  className,
}: UniverseSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="pl-9 h-10 rounded-xl bg-card border-border/30 text-sm"
      />
    </div>
  );
}
