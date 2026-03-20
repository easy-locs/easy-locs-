import { getConversationTitle, getConversationSubtitle } from "@/lib/chat/conversationUi";

type ConversationListItemProps = {
  conversation: any;
  active?: boolean;
  myOrbitId: string;
  onOpen: (conversation: any) => void;
};

export function ConversationListItem({
  conversation,
  active,
  myOrbitId,
  onOpen,
}: ConversationListItemProps) {
  const title = getConversationTitle(conversation, myOrbitId);
  const subtitle = getConversationSubtitle(conversation, myOrbitId);

  return (
    <button
      onClick={() => onOpen(conversation)}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors active:scale-[0.98] ${
        active
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-accent/5 border border-transparent"
      }`}
    >
      <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
        {title.slice(0, 2).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <span className="text-[11px] text-muted-foreground/60 shrink-0">
            {conversation.last_message_at
              ? new Date(conversation.last_message_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/70 truncate">{subtitle}</p>
      </div>
    </button>
  );
}
