/**
 * VoiceRecorder — Press-and-hold voice message recorder with cancel gesture.
 * Records audio via MediaRecorder API, uploads to chat-media bucket.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Safari doesn't support audio/webm; try webm first, then mp4, then default
      const mimeOpts: MediaRecorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeOpts.mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeOpts.mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeOpts.mimeType = "audio/mp4";
        }
        // else: let browser pick default
      }
      const recorder = new MediaRecorder(stream, mimeOpts);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      recorderRef.current = recorder;
      setRecording(true);
      setCancelled(false);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  }, []);

  const stopAndSend = useCallback(async () => {
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
            context_type: "booking",
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
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = () => {
        recorderRef.current?.stream.getTracks().forEach(t => t.stop());
      };
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    chunksRef.current = [];
  }, []);

  // Swipe-to-cancel on touch
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    currentXRef.current = e.touches[0].clientX;
    if (startXRef.current - currentXRef.current > 100) {
      cancelRecording();
    }
  };

  if (uploading) {
    return (
      <div className="p-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (recording) {
    return (
      <div
        className="flex items-center gap-3 flex-1 px-3"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Cancel */}
        <button onClick={cancelRecording} className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors">
          <X className="h-4 w-4" />
        </button>

        {/* Recording indicator */}
        <div className="flex-1 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive font-medium font-mono tabular-nums">{formatDur(duration)}</span>
          <span className="text-[10px] text-muted-foreground">← Slide to cancel</span>
        </div>

        {/* Send */}
        <button
          onClick={stopAndSend}
          className="p-2.5 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onPointerDown={startRecording}
      className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Hold to record"
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
