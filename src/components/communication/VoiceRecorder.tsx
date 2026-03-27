import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type Props = {
  thread: {
    id: string;
    v2ConversationId?: string | null;
    peerOrbitId?: string | null;
  } | null;
  myOrbitId?: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate: (threadId: string, updates: Record<string, unknown>) => void;
};

export default function VoiceRecorder({
  thread,
  myOrbitId,
  resolveAuthUserId,
  onThreadUpdate,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (e: any) {
      toast.error(e?.message || "Microphone access failed.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !thread?.v2ConversationId) return;

    const authUserId = await resolveAuthUserId();
    if (!authUserId) {
      toast.error("Authentication required.");
      return;
    }

    setSending(true);

    mediaRecorderRef.current.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fileName = `voice-${Date.now()}.webm`;
        const path = `orbit/${thread.v2ConversationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(path, blob, {
            contentType: "audio/webm",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(path);

        const now = new Date().toISOString();
        const body = "🎤 Voice message";

        const { error } = await db.from("chat_messages_v2").insert({
          conversation_id: thread.v2ConversationId,
          sender_user_id: authUserId,
          sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: "voice",
          body,
          attachments: [
            {
              name: fileName,
              type: "audio/webm",
              size: blob.size,
              url: data.publicUrl,
            },
          ],
        });

        if (error) throw error;

        await db
          .from("conversations_v2")
          .update({
            last_message_at: now,
            last_message_preview: body,
            updated_at: now,
          })
          .eq("id", thread.v2ConversationId);

        onThreadUpdate(thread.id, {
          lastMessage: body,
          lastMessageTime: now,
          lastMessagePreview: body,
        });

        toast.success("Voice message sent.");
      } catch (e: any) {
        toast.error(e?.message || "Voice send failed.");
      } finally {
        setSending(false);
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      disabled={sending}
      className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
    >
      {recording ? "Stop" : sending ? "Sending..." : "Voice"}
    </button>
  );
}
