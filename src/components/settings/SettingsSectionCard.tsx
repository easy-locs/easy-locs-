/**
 * SettingsSectionCard — A grouped settings card with title, icon rows, and navigation.
 * Used in the Me/Settings page for clean card-based sections.
 */
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export interface SettingsItem {
  label: string;
  path?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  subtitle?: string;
  badge?: string;
  destructive?: boolean;
  trailing?: React.ReactNode;
}

interface SettingsSectionCardProps {
  title: string;
  items: SettingsItem[];
  className?: string;
}

export function SettingsSectionCard({ title, items, className }: SettingsSectionCardProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("rounded-2xl border border-border/15 bg-card overflow-hidden", className)}>
      <div className="px-4 pt-3.5 pb-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </h3>
      </div>

      <div className="divide-y divide-border/10">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.onClick) item.onClick();
                else if (item.path) navigate(item.path);
              }}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 min-h-[48px] text-left",
                "active:bg-muted/40 transition-colors duration-100",
                item.destructive && "text-destructive"
              )}
            >
              {Icon && (
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  item.destructive ? "bg-destructive/10" : "bg-muted/60"
                )}>
                  <Icon className={cn("h-4 w-4", item.destructive ? "text-destructive" : "text-muted-foreground")} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className={cn("text-sm font-medium", item.destructive ? "text-destructive" : "text-foreground")}>
                  {item.label}
                </span>
                {item.subtitle && (
                  <p className="text-[11px] text-muted-foreground break-words leading-snug">{item.subtitle}</p>
                )}
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                  {item.badge}
                </span>
              )}
              {item.trailing ?? (
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
