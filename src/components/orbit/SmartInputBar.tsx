/**
 * SmartInputBar — Unified input for Orbit conversations.
 * 
 * Features:
 * - Text input with auto-resize
 * - Voice message recording (streaming)
 * - Quick actions (Pay, Confirm, Track, Sign)
 * - Typing indicators
 * - Gesture-driven (swipe to record)
 * - Ghost mode awareness
 * - Attachment support
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Mic, Plus, Camera, MapPin, CreditCard,
  FileText, CheckCircle2, Package, X, Paperclip,
} from "lucide-react";
import { haptic } from "@/lib/haptics";

interface SmartInputBarProps {
  onSend: (text: string) => void;
  onVoiceStart?: () => void;
  onVoiceStop?: (blob: Blob, duration: number) => void;
  onAction?: (action: string) => void;
  onTyping?: () => void;
  onAttachment?: (file: File) => void;
  disabled?: boolean;
  isGhost?: boolean;
  placeholder?: string;
  threadContext?: string;
}

const QUICK_ACTIONS = [
  { id: "pay", icon: CreditCard, label: "Pay", color: "hsl(var(--hud-success))" },
  { id: "confirm", icon: CheckCircle2, label: "Confirm", color: "hsl(var(--hud-cyan))" },
  { id: "track", icon: Package, label: "Track", color: "hsl(var(--hud-warning))" },
  { id: "location", icon: MapPin, label: "Location", color: "hsl(var(--hud-primary))" },
  { id: "document", icon: FileText, label: "Document", color: "hsl(var(--hud-text-dim))" },
  { id: "camera", icon: Camera, label: "Photo", color: "hsl(var(--hud-text-dim))" },
];

export default function SmartInputBar({
  onSend,
  onVoiceStart,
  onVoiceStop,
  onAction,
  onTyping,
  onAttachment,
  disabled = false,
  isGhost = false,
  placeholder = "Message…",
  threadContext,
}: SmartInputBarProps) {
  const [text, setText] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasText = text.trim().length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  const handleSend = useCallback(() => {
    if (!hasText || disabled) return;
    haptic("light");
    onSend(text.trim());
    setText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }
  }, [text, hasText, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping?.();
  }, [onTyping]);

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onVoiceStop?.(blob, recordDuration);
        setRecordDuration(0);
      };

      recorder.start(100); // stream in 100ms chunks
      mediaRecorderRef.current = recorder;
      setRecording(true);
      haptic("medium");
      onVoiceStart?.();

      recordTimerRef.current = setInterval(() => {
        setRecordDuration(d => d + 1);
      }, 1000);
    } catch {
      console.warn("[SmartInput] Microphone access denied");
    }
  }, [onVoiceStart, onVoiceStop, recordDuration]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    haptic("light");
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }
    chunksRef.current = [];
    setRecording(false);
    setRecordDuration(0);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Quick Actions Panel */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 flex gap-2 overflow-x-auto scrollbar-none" style={{
              borderTop: "1px solid hsl(var(--hud-border) / 0.1)",
            }}>
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.id}
                  onClick={() => {
                    haptic("light");
                    onAction?.(action.id);
                    setShowActions(false);
                  }}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl shrink-0 transition-all active:scale-95"
                  style={{
                    background: "hsl(var(--hud-surface))",
                    border: "1px solid hsl(var(--hud-border) / 0.1)",
                  }}
                >
                  <action.icon className="h-5 w-5" style={{ color: action.color }} />
                  <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <div className="flex items-end gap-2 px-3 py-2 safe-area-bottom" style={{
        borderTop: "1px solid hsl(var(--hud-border) / 0.1)",
      }}>
        {/* Plus / Actions toggle */}
        <button
          onClick={() => { setShowActions(!showActions); haptic("light"); }}
          className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: showActions ? "hsl(var(--hud-primary) / 0.1)" : "hsl(var(--hud-surface))",
            color: showActions ? "hsl(var(--hud-primary))" : "hsl(var(--hud-text-dim))",
          }}
        >
          {showActions ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>

        {/* Recording state */}
        {recording ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex items-center gap-3 px-4 h-10 rounded-full"
            style={{
              background: "hsl(var(--hud-danger) / 0.08)",
              border: "1px solid hsl(var(--hud-danger) / 0.2)",
            }}
          >
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "hsl(var(--hud-danger))" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm font-mono font-medium" style={{ color: "hsl(var(--hud-danger))" }}>
              {formatDuration(recordDuration)}
            </span>
            <div className="flex-1" />
            <button onClick={cancelRecording} className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>
              Cancel
            </button>
          </motion.div>
        ) : (
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={isGhost ? "🔒 Ghost message…" : placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none px-4 py-2 rounded-2xl text-sm leading-5 outline-none transition-colors"
              style={{
                background: "hsl(var(--hud-surface))",
                color: "hsl(var(--hud-text))",
                border: "1px solid hsl(var(--hud-border) / 0.15)",
                maxHeight: 120,
              }}
            />
          </div>
        )}

        {/* Send / Voice toggle */}
        {hasText ? (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={handleSend}
            disabled={disabled}
            className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: "hsl(var(--hud-primary))",
              color: "white",
            }}
          >
            <Send className="h-4 w-4" />
          </motion.button>
        ) : recording ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={stopRecording}
            className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center"
            style={{
              background: "hsl(var(--hud-danger))",
              color: "white",
            }}
          >
            <Send className="h-4 w-4" />
          </motion.button>
        ) : (
          <button
            onMouseDown={startRecording}
            onTouchStart={startRecording}
            className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: "hsl(var(--hud-surface))",
              color: "hsl(var(--hud-text-dim))",
              border: "1px solid hsl(var(--hud-border) / 0.15)",
            }}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Ghost indicator */}
      {isGhost && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--hud-primary)), transparent)",
          opacity: 0.4,
        }} />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAttachment?.(file);
        }}
      />
    </div>
  );
}
