/**
 * ChatHeader — Extracted from HudChatPanel.
 * Displays thread name, avatar, call buttons, actions menu.
 */
import { Phone, Video, MoreVertical, ArrowLeft, Lock, ChevronRight, Shield, CheckCheck } from "lucide-react";
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
    <div className="px-3 sm:px-4 py-2.5 shrink-0" style={{
      borderBottom: "1px solid hsl(var(--hud-border) / 0.08)",
      background: "hsl(var(--hud-surface) / 0.5)",
      backdropFilter: "blur(12px)",
    }}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9 rounded-full hover:bg-[hsl(var(--hud-surface-2))]">
          <ArrowLeft className="h-4 w-4" style={{ color: "hsl(var(--hud-text))" }} />
        </Button>

        <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{
          background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.15), hsl(var(--hud-cyan) / 0.05))",
          border: "1.5px solid hsl(var(--hud-cyan) / 0.2)",
        }}>
          <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
            {(thread.name || "?")[0].toUpperCase()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold line-clamp-1 break-words" style={{ color: "hsl(var(--hud-text))" }}>{thread.name}</p>
            {thread.propertyCountry && <span className="text-xs shrink-0">{getCountryEntryOrDefault(thread.propertyCountry).flag}</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {moduleConfig.emoji} {moduleConfig.label}
            </span>
            {thread.bookingStatus && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 text-[9px]" style={{ color: "hsl(var(--hud-success) / 0.6)" }}>
              <Lock className="h-2 w-2" /> E2E
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button disabled={isInCall || isStartingCall} onClick={() => { trackOrbitEvent("orbit.call.started", { screen: "chat", component: "ChatHeader", action: "audio_call", result: "success" }); onStartCall(false); }}
            className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))] disabled:opacity-40">
            <Phone className="h-[18px] w-[18px]" style={{ color: "hsl(var(--hud-success))" }} />
          </button>
          <button disabled={isInCall || isStartingCall} onClick={() => { trackOrbitEvent("orbit.call.started", { screen: "chat", component: "ChatHeader", action: "video_call", result: "success" }); onStartCall(true); }}
            className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))] disabled:opacity-40">
            <Video className="h-[18px] w-[18px]" style={{ color: "hsl(var(--hud-cyan))" }} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))]">
                <MoreVertical className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 max-h-[70vh] overflow-y-auto" style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.2)" }}>
              {CONV_STATUSES.map(s => (
                <DropdownMenuItem key={s.value} onClick={() => onUpdateStatus(s.value)} className={convStatus === s.value ? "font-semibold" : ""}>
                  {s.icon} {t(`orbit.status.${s.value}`) || s.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { haptic("light"); onShowSecurityPanel(); }}>
                <Shield className="h-3.5 w-3.5 mr-2" style={{ color: e2eReady ? "hsl(var(--hud-success))" : "hsl(var(--hud-text-dim))" }} />
                {t("orbit.security") || "Security"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { haptic("light"); onShowSafetyNumber(); }}>
                <Lock className="h-3.5 w-3.5 mr-2" style={{ color: "hsl(var(--hud-text-dim))" }} />
                {t("orbit.safety_number") || "Safety Number"}
              </DropdownMenuItem>
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
