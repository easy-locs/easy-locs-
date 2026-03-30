/**
 * SystemCard — Inline system notice card.
 */
import { memo } from "react";
import { Info } from "lucide-react";
import type { CanonicalMessageEnvelope } from "@/families/messages/canonical-envelope";

interface Props {
  envelope: CanonicalMessageEnvelope;
}

function SystemCard({ envelope }: Props) {
  const variant = envelope.metadata.ui?.variant || "info";
  const variantColors: Record<string, string> = {
    info: "hsl(var(--muted-foreground) / 0.6)",
    success: "hsl(var(--primary) / 0.7)",
    warning: "hsl(var(--warning, 45 93% 47%) / 0.7)",
    danger: "hsl(var(--destructive) / 0.7)",
  };
  const color = variantColors[variant] || variantColors.info;

  return (
    <div className="flex justify-center px-4 py-1.5">
      <div
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
        style={{
          background: "hsl(var(--muted) / 0.3)",
          border: "1px solid hsl(var(--border) / 0.06)",
        }}
      >
        <Info className="h-3 w-3 shrink-0" style={{ color }} />
        <span className="text-[11px]" style={{ color }}>
          {envelope.body}
        </span>
      </div>
    </div>
  );
}

export default memo(SystemCard);
