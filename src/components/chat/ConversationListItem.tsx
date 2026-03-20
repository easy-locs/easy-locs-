import { cn } from "@/lib/utils";

type ConversationListItemProps = {
  conversation: {
    id: string;
    title: string;
    lastMessage?: { type?: string; body?: string } | null;
    lastMessageAt?: string | null;
    unreadCount?: number;
  };
  active?: boolean;
  onOpen: (id: string) => void;
};

function getPreview(lastMessage?: { type?: string; body?: string } | null) {
  if (!lastMessage) return "";
  if (lastMessage.type === "call") return `📞 ${lastMessage.body}`;
  if (lastMessage.type === "image") return "🖼️ Photo";
  if (lastMessage.type === "file") return "📎 Document";
  return lastMessage.body ?? "";
}

export function ConversationListItem({ conversation, active, onOpen }: ConversationListItemProps) {
  const preview = getPreview(conversation.lastMessage);

  return (
    <button
      onClick={() => onOpen(conversation.id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:scale-[0.99]",
        active ? "bg-muted/60" : "hover:bg-muted/30"
      )}
    >
      <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
        {conversation.title.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground truncate">
            {conversation.title}
          </span>
          {conversation.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
              {conversation.lastMessageAt}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground truncate">{preview}</p>
          {(conversation.unreadCount ?? 0) > 0 && (
            <span className="shrink-0 ml-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
