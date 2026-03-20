import { useMemo, useState } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useOrbitStore } from "@/stores/orbitStore";

export function ConversationThread(props: {
  conversationId: string | null;
}) {
  const [draft, setDraft] = useState("");
  const orbit = useOrbitStore((s) => s.profile);
  const getMessagesByConversation = useChatStore((s) => s.getMessagesByConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const messages = useMemo(
    () => (props.conversationId ? getMessagesByConversation(props.conversationId) : []),
    [props.conversationId, getMessagesByConversation]
  );

  if (!props.conversationId) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground">Thread</h3>
        <p className="text-xs text-muted-foreground mt-2">No conversation selected</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Thread</h3>

      <div className="space-y-2 max-h-64 overflow-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="rounded-lg border border-border p-2">
            <p className="text-xs font-medium text-foreground">{msg.senderOrbitId}</p>
            <p className="text-sm text-foreground">{msg.body}</p>
            <p className="text-[10px] text-muted-foreground">{msg.createdAt}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          placeholder="Write a message"
        />
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => {
            if (!draft.trim() || !orbit?.orbitId || !props.conversationId) return;
            void sendMessage({
              conversationId: props.conversationId,
              senderOrbitId: orbit.orbitId,
              body: draft.trim(),
              type: "text",
            });
            setDraft("");
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
