/**
 * SecurityLevelPicker — Compact security level selector for the message composer.
 * Shows current level as a small badge, opens a popover with all options.
 */
import { useState } from "react";
import { Shield } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { haptic } from "@/lib/haptics";
import { SECURITY_LEVEL_OPTIONS, SECURITY_POLICIES, type SecurityLevel } from "@/lib/message-security";

interface Props {
  value: SecurityLevel;
  onChange: (level: SecurityLevel) => void;
}

export default function SecurityLevelPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = SECURITY_POLICIES[value];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-colors"
          style={{
            background: value !== "normal"
              ? "hsl(var(--hud-warning) / 0.15)"
              : "transparent",
            color: value !== "normal"
              ? "hsl(var(--hud-warning))"
              : "hsl(var(--hud-text-dim) / 0.5)",
          }}
          title={`Security: ${current.label}`}
        >
          {value !== "normal" ? (
            <span className="text-xs">{current.emoji}</span>
          ) : (
            <Shield className="h-3.5 w-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-56 p-0 overflow-hidden"
        style={{
          background: "hsl(var(--hud-bg))",
          borderColor: "hsl(var(--hud-border) / 0.2)",
          borderRadius: 12,
        }}
      >
        <div className="px-3 py-2" style={{
          borderBottom: "1px solid hsl(var(--hud-border) / 0.08)",
          background: "hsl(var(--hud-surface) / 0.3)",
        }}>
          <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
            Message Security
          </p>
        </div>
        <div className="py-1">
          {SECURITY_LEVEL_OPTIONS.map(opt => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  haptic("light");
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                style={{
                  background: isActive ? "hsl(var(--hud-cyan) / 0.08)" : "transparent",
                  color: "hsl(var(--hud-text))",
                }}
              >
                <span className="text-sm shrink-0 w-6 text-center">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium" style={{
                    color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text))",
                  }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                    {opt.description}
                  </p>
                </div>
                {isActive && (
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ background: "hsl(var(--hud-cyan))" }} />
                )}
              </button>
            );
          })}
        </div>
        {/* Limitation notice */}
        {value !== "normal" && SECURITY_POLICIES[value].limitation && (
          <div className="px-3 py-2" style={{
            borderTop: "1px solid hsl(var(--hud-border) / 0.08)",
            background: "hsl(var(--hud-warning) / 0.05)",
          }}>
            <p className="text-[9px] leading-tight" style={{ color: "hsl(var(--hud-warning) / 0.8)" }}>
              {SECURITY_POLICIES[value].limitation}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
