/**
 * VoiceRecorder — Premium hold-to-record voice recorder with slide-to-cancel.
 * Records audio via MediaRecorder API, uploads to chat-media bucket.
 * Signal-grade UX with animated waveform during recording.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

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
  const [waveAmplitude, setWaveAmplitude] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startXRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const updateAmplitude = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setWaveAmplitude(Math.min(1, rms * 4));
    animFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      // Audio analysis for visual feedback
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        updateAmplitude();
      } catch {}

      const mimeOpts: MediaRecorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeOpts.mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeOpts.mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeOpts.mimeType = "audio/mp4";
        }
      }
      const recorder = new MediaRecorder(stream, mimeOpts);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
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
  }, [updateAmplitude]);

  const stopAndSend = useCallback(async () => {
    if (!recorderRef.current || cancelled) return;
    const recorder = recorderRef.current;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        recorder.stream.getTracks().forEach(t => t.stop());
        analyserRef.current = null;

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
          const { error } = await supabase.storage.from("chat-media").upload(path, blob);
          if (error) throw error;
          const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
          const url = signed?.signedUrl || path;

          const { data: inserted } = await supabase.from("messages").insert({
            org_id: orgId,
            sender_id: userId,
            content: `🎤 Voice message (${formatDur(duration)})`,
            context_id: contextId,
            context_type: contextId.startsWith("direct:") ? "direct" : "booking",
            contact_email: userEmail,
            contact_name: userName,
            message_type: "user",
            conversation_status: "waiting_provider",
            audio_url: url,
            audio_duration_seconds: duration,
          } as any).select("*").single();

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
  }, [cancelled, duration, orgId, contextId, userId, userEmail, userName, onSent]);

  const cancelRecording = useCallback(() => {
    setCancelled(true);
    haptic("light");
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = () => {
        recorderRef.current?.stream.getTracks().forEach(t => t.stop());
      };
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    setRecording(false);
    chunksRef.current = [];
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current - e.touches[0].clientX > 100) {
      cancelRecording();
    }
  };

  if (uploading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
        <span className="text-xs font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Sending…
        </span>
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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Cancel */}
          <button
            onClick={cancelRecording}
            className="shrink-0 h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: "hsl(var(--hud-danger) / 0.12)",
              color: "hsl(var(--hud-danger))",
            }}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Recording indicator with live amplitude */}
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div
              className="h-3 w-3 rounded-full shrink-0 animate-pulse"
              style={{ background: "hsl(var(--hud-danger))" }}
            />
            <span
              className="text-sm font-mono tabular-nums font-semibold"
              style={{ color: "hsl(var(--hud-text))" }}
            >
              {formatDur(duration)}
            </span>

            {/* Mini waveform — CSS-only for performance */}
            <div className="flex items-center gap-[2px] flex-1 h-5">
              {Array.from({ length: 16 }, (_, i) => {
                const h = Math.max(3, 3 + waveAmplitude * 16 * Math.abs(Math.sin(i * 0.8)));
                return (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-150"
                    style={{
                      width: 2,
                      height: h,
                      background: "hsl(var(--hud-danger) / 0.5)",
                    }}
                  />
                );
              })}
            </div>

            <span className="text-[10px] shrink-0" style={{ color: "hsl(var(--hud-text-dim))" }}>
              ← Slide
            </span>
          </div>

          {/* Send */}
          <button
            onClick={stopAndSend}
            className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: "hsl(var(--hud-cyan))",
              color: "hsl(var(--hud-bg))",
              boxShadow: "0 2px 12px hsl(var(--hud-cyan) / 0.3)",
            }}
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
      className="shrink-0 h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-all active:scale-90"
      style={{
        background: "hsl(var(--hud-surface))",
        color: "hsl(var(--hud-text-dim))",
        border: "1px solid hsl(var(--hud-border) / 0.12)",
      }}
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
