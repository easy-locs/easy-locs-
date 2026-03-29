/**
 * ChatHeader — Extracted from HudChatPanel.
 * Displays thread name, avatar, call buttons, actions menu.
 */
import { Phone, Video, MoreVertical, ArrowLeft, ChevronRight, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CONV_STATUSES, STATUS_COLORS, STATUS_LABELS, SOURCE_MODULE_CONFIG } from "../types";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
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
  thread, convStatus, e2eReady, isInCall, isStartingCall,
  onBack, onStartCall, onUpdateStatus, onToggleContext,
  onShowSecurityPanel, onShowSafetyNumber, onEnterSelectMode, t,
}: Props) {
  const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];

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
          background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.15), hsl(var(--hud-cyan) / 0.05))",
          border: "1px solid hsl(var(--hud-cyan) / 0.2)",
        }}>
          <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
            {(typeof thread.name === "string" ? thread.name : "?")[0]?.toUpperCase() || "?"}
          </span>
        </div>

        <div className="min-w-0 flex-1" onClick={onToggleContext} style={{ cursor: "pointer" }}>
          <p className="text-[13px] font-semibold line-clamp-1 break-words leading-tight" style={{ color: "hsl(var(--hud-text))" }}>
            {typeof thread.name === "string" ? thread.name : "Contact"}
          </p>
          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
            {thread.bookingStatus
              ? `${STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}`
              : "tap for info"}
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
            <DropdownMenuContent align="end" className="w-48 max-h-[70vh] overflow-y-auto" style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.2)" }}>
              {CONV_STATUSES.map(s => (
                <DropdownMenuItem key={s.value} onClick={() => onUpdateStatus(s.value)} className={convStatus === s.value ? "font-semibold" : ""}>
                  {s.icon} {t(`orbit.status.${s.value}`) || s.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleContext}>
                <ChevronRight className="h-3.5 w-3.5 mr-2" /> {t("orbit.details") || "Details"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { haptic("light"); onEnterSelectMode(); }}>
                <CheckCheck className="h-3.5 w-3.5 mr-2" style={{ color: "hsl(var(--hud-text-dim))" }} />
                {t("orbit.select_messages") || "Select Messages"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
