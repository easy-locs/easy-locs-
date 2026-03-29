/**
 * MessageComposer — Canonical Orbit V2 bottom composer.
 * Single source of truth for all thread-level message input.
 *
 * Structure: [emoji] [attach] [input] [send|mic]
 * Behavior: fixed bottom, safe-area aware, keyboard stable.
 */
import { useRef, useState } from "react";
import { Send, Loader2, Paperclip, Camera, MapPin, Eye, Mic, Ban, Check, Smile, Zap } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { haptic } from "@/lib/haptics";

export interface MessageComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onAttach?: () => void;
  onEmoji?: () => void;
  onStartVoice?: () => void;
  onStopVoice?: () => Promise<{ blob: Blob; duration: number; url: string }>;
  onCancelVoice?: () => void;
  onSendVoice?: () => void;
  onDiscardVoice?: () => void;
  onTyping?: () => void;
  disabled?: boolean;
  sending?: boolean;
  uploading?: boolean;
  placeholder?: string;
  /** Extra attachment menu items beyond default file/camera */
  attachmentActions?: {
    onFileUpload?: (file: File) => void;
    onCameraCapture?: (file: File) => void;
    onLocation?: () => void;
    onViewOnce?: (file: File) => void;
  };
  /** Reply-to banner */
  replyTo?: { content: string; senderName?: string } | null;
  onClearReply?: () => void;
  voiceRecording?: boolean;
  voicePreview?: { blob: Blob; duration: number; url: string } | null;
  voiceDuration?: number;
}

export default function MessageComposer({
  value, onChange, onSend, onKeyDown, onAttach, onEmoji, onStartVoice,
  onStopVoice, onCancelVoice, onSendVoice, onDiscardVoice, onTyping,
  disabled = false, sending = false, uploading = false, placeholder = "Message…",
  attachmentActions, replyTo, onClearReply, voiceRecording = false, voicePreview = null, voiceDuration = 0,
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasText = value.trim().length > 0;

  const handleSend = () => {
    if (!hasText || sending || disabled) return;
    onSend();
  };

  const handleMicStart = () => {
    if (onStartVoice) {
      haptic("medium");
      onStartVoice();
    }
  };

  const formatVoiceDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Reply banner */}
      {replyTo && (
        <div className="px-3 py-2 flex items-center gap-2 shrink-0 border-t border-border bg-accent/5 border-l-[3px] border-l-accent">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-accent">Reply</p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {replyTo.content.length > 80 ? replyTo.content.slice(0, 80) + "…" : replyTo.content}
            </p>
          </div>
          {onClearReply && (
            <button onClick={onClearReply} className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>
      )}

      {/* Composer bar */}
      <div className={`px-2 sm:px-3 py-2 safe-area-pb shrink-0 bg-muted/40 ${!replyTo ? "border-t border-border" : ""}`}>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file && attachmentActions?.onFileUpload) attachmentActions.onFileUpload(file);
            e.target.value = "";
          }}
        />

        {voiceRecording ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onCancelVoice?.();
                haptic("light");
              }}
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-destructive/15 text-destructive"
            >
              <Ban className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="h-2.5 w-2.5 rounded-full animate-pulse bg-destructive" />
              <span className="text-sm font-mono tabular-nums text-foreground">{formatVoiceDuration(voiceDuration)}</span>
              <span className="text-[11px] text-muted-foreground truncate">Slide to cancel</span>
            </div>
            <button
              onClick={async () => {
                haptic("medium");
                await onStopVoice?.();
              }}
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-md"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : voicePreview ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDiscardVoice?.();
                haptic("light");
              }}
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-destructive/15 text-destructive"
            >
              <Ban className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2 bg-background border border-border min-w-0">
              <button
                onClick={() => {
                  const a = new Audio(voicePreview.url);
                  void a.play();
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/15 text-primary shrink-0"
              >
                <Zap className="h-4 w-4" />
              </button>
              <div className="flex-1 h-1 rounded-full bg-border" />
              <span className="text-xs font-mono text-muted-foreground shrink-0">{formatVoiceDuration(voicePreview.duration)}</span>
            </div>
            <button
              onClick={() => {
                haptic("medium");
                onSendVoice?.();
              }}
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-md"
              disabled={uploading || disabled}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        ) : (
        <div className="flex items-end gap-1.5">
          {/* Input area with emoji + attach inside */}
          <div className="flex-1 min-w-0 flex items-end rounded-2xl px-1.5 py-1 bg-background border border-border">
            {/* Emoji */}
            {onEmoji && (
              <button
                onClick={onEmoji}
                className="shrink-0 h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <Smile className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {/* Attachment */}
            <DropdownMenu open={showAttachMenu} onOpenChange={setShowAttachMenu}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={onAttach}
                  className="shrink-0 h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-full hover:bg-muted"
                  disabled={disabled}
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-44">
                <DropdownMenuItem onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}>
                  <Paperclip className="h-4 w-4 mr-2 text-primary" /> File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setShowAttachMenu(false);
                  const inp = document.createElement("input");
                  inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
                  inp.onchange = () => {
                    const f = inp.files?.[0];
                    if (f && attachmentActions?.onCameraCapture) attachmentActions.onCameraCapture(f);
                    else if (f && attachmentActions?.onFileUpload) attachmentActions.onFileUpload(f);
                  };
                  inp.click();
                }}>
                  <Camera className="h-4 w-4 mr-2 text-accent" /> Camera
                </DropdownMenuItem>
                {attachmentActions?.onLocation && (
                  <DropdownMenuItem onClick={() => { setShowAttachMenu(false); attachmentActions.onLocation!(); }}>
                    <MapPin className="h-4 w-4 mr-2 text-accent" /> Location
                  </DropdownMenuItem>
                )}
                {attachmentActions?.onViewOnce && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setShowAttachMenu(false);
                      const inp = document.createElement("input");
                      inp.type = "file"; inp.accept = "image/*";
                      inp.onchange = () => { const f = inp.files?.[0]; if (f) attachmentActions.onViewOnce!(f); };
                      inp.click();
                    }}>
                      <Eye className="h-4 w-4 mr-2 text-destructive" /> View Once
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Text input */}
            <input
              value={value}
              onChange={e => {
                onChange(e.target.value);
                onTyping?.();
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 min-w-0 h-9 bg-transparent border-0 outline-none text-sm px-2 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Send / Mic button */}
          <button
            onClick={hasText ? handleSend : undefined}
            onTouchStart={!hasText && onStartVoice ? (e) => {
              holdTimerRef.current = setTimeout(handleMicStart, 200);
            } : undefined}
            onTouchEnd={!hasText && onStartVoice ? () => {
              if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
            } : undefined}
            onMouseDown={!hasText && onStartVoice ? handleMicStart : undefined}
            disabled={sending || disabled}
            className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              hasText
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground border border-border"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasText ? (
              <Send className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        </div>
        )}
      </div>
    </>
  );
}
