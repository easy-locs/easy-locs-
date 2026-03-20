import { useChatStore } from "@/stores/chatStore";

export function ConversationList(props: {
  onOpen: (conversationId: string) => void;
}) {
  const conversations = useChatStore((s) => s.conversations);

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Conversations</h3>
      <div className="space-y-1">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => props.onOpen(conv.id)}
          >
            <p className="text-sm font-medium text-foreground">{conv.title ?? conv.id}</p>
            <p className="text-xs text-muted-foreground">Type: {conv.type}</p>
            <p className="text-xs text-muted-foreground">Updated: {conv.updatedAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
