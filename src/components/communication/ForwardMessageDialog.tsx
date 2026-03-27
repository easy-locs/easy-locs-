import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type TargetThread = {
  id: string;
  v2ConversationId: string;
  name: string;
  peerOrbitId?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  message: {
    body: string;
    attachments?: unknown[] | null;
    type?: string;
  } | null;
  threads: TargetThread[];
  resolveAuthUserId: () => Promise<string | null>;
  myOrbitId?: string | null;
};

export default function ForwardMessageDialog({
  open,
  onClose,
  message,
  threads,
  resolveAuthUserId,
  myOrbitId,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  if (!open || !message) return null;

  const forwardTo = async (thread: TargetThread) => {
    const authUserId = await resolveAuthUserId();
    if (!authUserId) {
      toast.error("Authentication required.");
      return;
    }

    setSubmitting(true);

    try {
      const body = `↪ ${message.body}`;
      const now = new Date().toISOString();

      const { error } = await db.from("chat_messages_v2").insert({
        conversation_id: thread.v2ConversationId,
        sender_user_id: authUserId,
        sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: thread.peerOrbitId ?? null,
        type: message.type || "text",
        body,
        attachments: message.attachments ?? null,
        metadata: {
          forwarded: true,
        },
      });

      if (error) throw error;

      await db
        .from("conversations_v2")
        .update({
          last_message_at: now,
          last_message_preview: body.slice(0, 120),
          updated_at: now,
        })
        .eq("id", thread.v2ConversationId);

      toast.success("Message forwarded.");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Forward failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-background p-4 shadow-lg">
        <h3 className="mb-3 text-lg font-semibold text-foreground">Forward message</h3>

        <div className="max-h-60 space-y-2 overflow-y-auto">
          {threads.map((thread) => (
            <button
              key={thread.id}
              disabled={submitting}
              onClick={() => forwardTo(thread)}
              className="w-full rounded-xl border border-border px-3 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              {thread.name}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          Close
        </button>
      </div>
    </div>
  );
}
