import { useRef, useState } from "react";
import { toast } from "sonner";
import { uploadChatAttachment, signChatAttachmentUrl } from "@/repositories/communication.repository";
import { Mic, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

interface Props {
  orgId: string;
  contextId: string;
  userId: string;
  userEmail: string;
  userName: string;
  onSent: (msg: any) => void;
}

export default function VoiceRecorder({ orgId, contextId, userId, userEmail, userName, onSent }: Props) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startXRef = useRef(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const mimeOpts: MediaRecorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeOpts.mimeType = "audio/webm;codecs=opus";
        else if (MediaRecorder.isTypeSupported("audio/webm")) mimeOpts.mimeType = "audio/webm";
        else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeOpts.mimeType = "audio/mp4";
      }
      const recorder = new MediaRecorder(stream, mimeOpts);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      recorderRef.current = recorder;
      setRecording(true);
      setCancelled(false);
      setDuration(0);
      haptic("medium");
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (e: any) {
      toast.error(e?.name === "NotAllowedError" ? "Microphone access denied" : "Microphone unavailable");
    }
  };

  const stopAndSend = async () => {
    if (!recorderRef.current || cancelled) return;
    const recorder = recorderRef.current;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        recorder.stream.getTracks().forEach(t => t.stop());

        if (chunksRef.current.length === 0 || duration < 1) {
          setRecording(false);
          resolve();
          return;
        }

        setUploading(true);
        haptic("light");
        try {
          const mime = recorderRef.current?.mimeType || "audio/webm";
          const ext = mime.includes("mp4") ? "m4a" : mime.includes("webm") ? "webm" : "ogg";
          const blob = new Blob(chunksRef.current, { type: mime });
          const path = `${orgId}/${contextId}/voice-${Date.now()}.${ext}`;
          await uploadChatAttachment(path, blob);
          const url = await signChatAttachmentUrl(path);

          const { insertMessage } = await import("@/repositories/communication.repository");
          const inserted = await insertMessage({
            conversationId: contextId,
            senderUserId: userId,
            senderOrbitId: `orbit_${userId.slice(0, 12)}`,
            type: "audio",
            body: `🎤 Voice message (${formatDur(duration)})`,
            metadata: { audio_url: url, audio_duration_seconds: duration },
          });

          if (inserted) onSent(inserted);
        } catch (e: any) {
          toast.error(e.message || "Failed to send voice message");
        }
        setUploading(false);
        setRecording(false);
        resolve();
      };
      recorder.stop();
    });
  };

  const cancelRecording = () => {
    setCancelled(true);
    haptic("light");
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = () => {
        recorderRef.current?.stream.getTracks().forEach(t => t.stop());
      };
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    chunksRef.current = [];
  };

  if (uploading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Sending…</span>
      </div>
    );
  }

  if (recording) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="flex items-center gap-3 flex-1 px-3"
          onTouchStart={(e) => { startXRef.current = e.touches[0].clientX; }}
          onTouchMove={(e) => { if (startXRef.current - e.touches[0].clientX > 100) cancelRecording(); }}
        >
          <button
            onClick={cancelRecording}
            className="shrink-0 h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center active:scale-90 transition-transform bg-destructive/12 text-destructive"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div className="h-3 w-3 rounded-full shrink-0 animate-pulse bg-destructive" />
            <span className="text-sm font-mono tabular-nums font-semibold text-foreground">
              {formatDur(duration)}
            </span>
            <span className="text-[10px] shrink-0 text-muted-foreground">← Slide</span>
          </div>

          <button
            onClick={stopAndSend}
            className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center active:scale-90 transition-transform bg-primary text-primary-foreground shadow-md"
          >
            <Send className="h-5 w-5" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="shrink-0 h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-all active:scale-90 bg-muted text-muted-foreground border border-border"
      title="Tap to record"
    >
      <Mic className="h-4 w-4" />
    </button>
  );
}

function formatDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
