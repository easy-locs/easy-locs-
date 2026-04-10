import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function AppSearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  autoFocus,
  onFocus,
  onBlur,
}: AppSearchInputProps) {
  return (
    <div className={cn("search-shell min-w-0", className)}>
      <Search className="search-shell__icon text-muted-foreground" />

      <input
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cn(
          "search-shell__input search-premium-field bg-card border border-border/40 text-foreground placeholder:text-muted-foreground outline-none transition-all",
          "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
          inputClassName,
        )}
      />

      {value ? (
        <button
          className="search-shell__clear bg-muted/60 hover:bg-muted text-muted-foreground"
          onClick={() => onChange("")}
          aria-label="Clear search"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}
