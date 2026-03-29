/**
 * ChatHeader — Compact messenger-first thread top bar.
 * Avatar + name + subtitle + call/video/menu.
 */
import { Phone, Video, MoreVertical, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { haptic } from "@/lib/haptics";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import type { ConversationThread } from "../types";

interface Props {
  thread: ConversationThread;
  convStatus: string;
  e2eReady: boolean;
  isInCall: boolean;
  isStartingCall: boolean;
  onBack: () => void;
  onStartCall: (isVideo: boolean) => void;
  onUpdateStatus: (status: string) => void;
  onToggleContext: () => void;
  onShowSecurityPanel: () => void;
  onShowSafetyNumber: () => void;
  onEnterSelectMode: () => void;
  t: (key: string) => string;
}

export default function ChatHeader({
  thread, isInCall, isStartingCall,
  onBack, onStartCall, onToggleContext,
  onEnterSelectMode, t,
}: Props) {
  const displayName = typeof thread.name === "string" ? thread.name : "Contact";
  const initial = displayName[0]?.toUpperCase() || "?";
  const subtitle = thread.email || "tap for info";

  return (
    <div className="px-2 sm:px-3 py-1.5 shrink-0" style={{
      borderBottom: "1px solid hsl(var(--hud-border) / 0.08)",
      background: "hsl(var(--hud-surface) / 0.5)",
      backdropFilter: "blur(12px)",
    }}>
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-[hsl(var(--hud-surface-2))]">
          <ArrowLeft className="h-4 w-4" style={{ color: "hsl(var(--hud-text))" }} />
        </button>

        <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{
          background: thread.avatarUrl ? `url(${thread.avatarUrl}) center/cover` : "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.15), hsl(var(--hud-cyan) / 0.05))",
          border: "1px solid hsl(var(--hud-cyan) / 0.2)",
        }}>
          {!thread.avatarUrl && (
            <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{initial}</span>
          )}
        </div>

        <div className="min-w-0 flex-1" onClick={onToggleContext} style={{ cursor: "pointer" }}>
          <p className="text-[13px] font-semibold line-clamp-1 break-words leading-tight" style={{ color: "hsl(var(--hud-text))" }}>
            {displayName}
          </p>
          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
            {subtitle}
          </p>
        </div>

        <div className="flex items-center shrink-0">
          <button disabled={isInCall || isStartingCall} onClick={() => { trackOrbitEvent("orbit.call.started", { screen: "chat", component: "ChatHeader", action: "audio_call", result: "success" }); onStartCall(false); }}
            className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))] disabled:opacity-40">
            <Phone className="h-[17px] w-[17px]" style={{ color: "hsl(var(--hud-success))" }} />
          </button>
          <button disabled={isInCall || isStartingCall} onClick={() => { trackOrbitEvent("orbit.call.started", { screen: "chat", component: "ChatHeader", action: "video_call", result: "success" }); onStartCall(true); }}
            className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))] disabled:opacity-40">
            <Video className="h-[17px] w-[17px]" style={{ color: "hsl(var(--hud-cyan))" }} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))]">
                <MoreVertical className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.2)" }}>
              <DropdownMenuItem onClick={onToggleContext}>
                {t("orbit.details") || "Details"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { haptic("light"); onEnterSelectMode(); }}>
                {t("orbit.select_messages") || "Select Messages"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
