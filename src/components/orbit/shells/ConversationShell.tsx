/**
 * ConversationShell — Canonical layout shell for an open conversation.
 * Fixed slots: Header (top) | Viewport (scrollable middle) | Footer (composer dock)
 * No business logic — purely structural.
 */
import { memo, type ReactNode } from "react";

interface Props {
  header: ReactNode;
  viewport: ReactNode;
  footer: ReactNode;
  overlays?: ReactNode;
}

function ConversationShell({ header, viewport, footer, overlays }: Props) {
  return (
    <div className="flex flex-col h-full relative" style={{ background: "hsl(var(--background))" }}>
      {/* Fixed Header */}
      <div className="shrink-0 z-10">{header}</div>

      {/* Scrollable Viewport */}
      <div className="flex-1 min-h-0 overflow-hidden relative">{viewport}</div>

      {/* Fixed Footer (Composer Dock) */}
      <div className="shrink-0 z-10">{footer}</div>

      {/* Overlays (call bars, location picker, media viewer) */}
      {overlays}
    </div>
  );
}

export default memo(ConversationShell);
