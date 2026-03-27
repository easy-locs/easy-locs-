/**
 * ComposerBar — Message input, attachment, voice recording.
 * Extracted from HudChatPanel composer section.
 */
import { useRef, useState } from "react";
import {
  Send, Loader2, Paperclip, Camera, MapPin, CreditCard, Eye, Mic, Ban, Check, Zap,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import SecurityLevelPicker from "../SecurityLevelPicker";
import AIGenerateButton from "@/components/ai/AIGenerateButton";
import { haptic } from "@/lib/haptics";
import { formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import type { SecurityLevel } from "@/lib/message-security";

interface Props {
  newMessage: string;
  sending: boolean;
  uploading: boolean;
  securityLevel: SecurityLevel;
  voiceRecording: boolean;
  voicePreview: { blob: Blob; duration: number; url: string } | null;
  voiceDuration: number;
  replyTo: { msgId: string; content: string; senderName?: string } | null;
  userId?: string;
  onMessageChange: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSecurityLevelChange: (level: SecurityLevel) => void;
  onFileUpload: (file: File) => void;
  onViewOnceUpload: (file: File) => void;
  onStartVoice: () => void;
  onStopVoice: () => Promise<{ blob: Blob; duration: number; url: string }>;
  onCancelVoice: () => void;
  onSendVoice: () => void;
  onDiscardVoice: () => void;
  onShowLocation: () => void;
  onShowPayment: () => void;
  onShowRequestMoney: () => void;
  onClearReply: () => void;
  onBroadcastTyping: () => void;
  t: (key: string) => string;
}

export default function ComposerBar({
  newMessage, sending, uploading, securityLevel,
  voiceRecording, voicePreview, voiceDuration, replyTo, userId,
  onMessageChange, onSend, onKeyDown, onSecurityLevelChange,
  onFileUpload, onViewOnceUpload, onStartVoice, onStopVoice, onCancelVoice,
  onSendVoice, onDiscardVoice, onShowLocation, onShowPayment, onShowRequestMoney,
  onClearReply, onBroadcastTyping, t,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const slideStartRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <>
      {/* Reply-to banner */}
      {replyTo && (
        <div className="px-3 py-2 flex items-center gap-2 shrink-0" style={{
          borderTop: "1px solid hsl(var(--hud-border) / 0.08)",
          background: "hsl(var(--hud-cyan) / 0.05)",
          borderLeft: "3px solid hsl(var(--hud-cyan))",
        }}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>
              {replyTo.senderName === userId ? "You" : "Reply"}
            </p>
            <p className="text-[11px] line-clamp-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {replyTo.content.length > 80 ? replyTo.content.slice(0, 80) + "…" : replyTo.content}
            </p>
          </div>
          <button onClick={onClearReply} className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center" style={{ color: "hsl(var(--hud-text-dim))" }}>✕</button>
        </div>
      )}

      {/* Composer */}
      <div className="px-2 sm:px-3 py-2 safe-area-pb shrink-0" style={{
        borderTop: replyTo ? "none" : "1px solid hsl(var(--hud-border) / 0.08)",
        background: "hsl(var(--hud-surface) / 0.4)",
      }}>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx"
          onChange={e => { const file = e.target.files?.[0]; if (file) onFileUpload(file); e.target.value = ""; }} />

        {voiceRecording ? (
          <div className="flex items-center gap-3"
            onTouchMove={(e) => {
              const touch = e.touches[0];
              if (slideStartRef.current && (slideStartRef.current - touch.clientX) > 100) {
                onCancelVoice(); haptic("light");
              }
            }}>
            <button onClick={() => { onCancelVoice(); haptic("light"); }}
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--hud-danger) / 0.15)", color: "hsl(var(--hud-danger))" }}>
              <Ban className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: "hsl(var(--hud-danger))" }} />
              <span className="text-sm font-mono tabular-nums" style={{ color: "hsl(var(--hud-text))" }}>
                {formatVoiceDuration(voiceDuration)}
              </span>
              <span className="text-[11px] animate-pulse" style={{ color: "hsl(var(--hud-text-dim))" }}>← Slide to cancel</span>
            </div>
            <button onClick={async () => { haptic("medium"); await onStopVoice(); }}
              className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              <Check className="h-5 w-5" />
            </button>
          </div>
        ) : voicePreview ? (
          <div className="flex items-center gap-2">
            <button onClick={() => { onDiscardVoice(); haptic("light"); }}
              className="shrink-0 h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--hud-danger) / 0.15)", color: "hsl(var(--hud-danger))" }}>
              <Ban className="h-3.5 w-3.5" />
            </button>
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "hsl(var(--hud-surface))" }}>
              <button onClick={() => { const a = new Audio(voicePreview.url); a.play(); }}
                className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center"
                style={{ background: "hsl(var(--hud-cyan) / 0.2)", color: "hsl(var(--hud-cyan))" }}>
                <Zap className="h-3.5 w-3.5" />
              </button>
              <div className="flex-1 h-1 rounded-full" style={{ background: "hsl(var(--hud-border) / 0.3)" }}>
                <div className="h-full rounded-full" style={{ width: "100%", background: "hsl(var(--hud-cyan))" }} />
              </div>
              <span className="text-xs font-mono" style={{ color: "hsl(var(--hud-text-dim))" }}>{formatVoiceDuration(voicePreview.duration)}</span>
            </div>
            <button onClick={() => { haptic("medium"); onSendVoice(); }}
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <div className="flex-1 min-w-0 flex items-end rounded-2xl px-1.5 py-1" style={{
              background: "hsl(var(--hud-surface))",
              border: "1px solid hsl(var(--hud-border) / 0.12)",
            }}>
              <SecurityLevelPicker value={securityLevel} onChange={onSecurityLevelChange} />
              <DropdownMenu open={showAttachMenu} onOpenChange={setShowAttachMenu}>
                <DropdownMenuTrigger asChild>
                  <button className="shrink-0 h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-full hover:bg-[hsl(var(--hud-surface-2))]" disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} /> : <Paperclip className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-44" style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.2)" }}>
                  <DropdownMenuItem onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}>
                    <Paperclip className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-cyan))" }} /> File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setShowAttachMenu(false);
                    const inp = document.createElement("input");
                    inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
                    inp.onchange = () => { const f = inp.files?.[0]; if (f) onFileUpload(f); };
                    inp.click();
                  }}>
                    <Camera className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-success))" }} /> Camera
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setShowAttachMenu(false); haptic("light"); onShowLocation(); }}>
                    <MapPin className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-warning))" }} /> Location
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setShowAttachMenu(false); onShowPayment(); }}>
                    <CreditCard className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-purple))" }} /> Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setShowAttachMenu(false); onShowRequestMoney(); }}>
                    <CreditCard className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-warning))" }} /> Request Money
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setShowAttachMenu(false);
                    const inp = document.createElement("input");
                    inp.type = "file"; inp.accept = "image/*";
                    inp.onchange = () => { const f = inp.files?.[0]; if (f) onViewOnceUpload(f); };
                    inp.click();
                  }}>
                    <Eye className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-danger))" }} /> View Once Photo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                value={newMessage}
                onChange={e => { onMessageChange(e.target.value); onBroadcastTyping(); }}
                onKeyDown={onKeyDown}
                placeholder="Message…"
                className="flex-1 min-w-0 h-9 bg-transparent border-0 outline-none text-sm px-2"
                style={{ color: "hsl(var(--hud-text))" }}
              />
              <div className="hidden sm:block shrink-0">
                <AIGenerateButton task="guest_reply" taskContext={newMessage || "message from client"} onApply={text => onMessageChange(text)} label="AI" variant="icon" />
              </div>
            </div>
            <button
              onClick={newMessage.trim() ? () => { trackOrbitEvent("orbit.message.sent", { screen: "chat", component: "ComposerBar", action: "text_send", result: "success" }); onSend(); } : undefined}
              onTouchStart={!newMessage.trim() ? (e) => {
                slideStartRef.current = e.touches[0].clientX;
                holdTimerRef.current = setTimeout(() => { haptic("medium"); onStartVoice(); }, 200);
              } : undefined}
              onTouchEnd={!newMessage.trim() ? () => {
                if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
              } : undefined}
              onMouseDown={!newMessage.trim() ? () => { haptic("medium"); onStartVoice(); } : undefined}
              disabled={sending}
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: newMessage.trim() ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-surface))",
                color: newMessage.trim() ? "hsl(var(--hud-bg))" : "hsl(var(--hud-text-dim))",
                border: newMessage.trim() ? "none" : "1px solid hsl(var(--hud-border) / 0.12)",
                WebkitTapHighlightColor: "transparent",
              }}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : newMessage.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
