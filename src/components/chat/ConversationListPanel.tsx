import { ConversationListItem } from "@/components/chat/ConversationListItem";

export function ConversationListPanel(props: {
  conversations: any[];
  activeConversationId?: string | null;
  myOrbitId: string;
  onOpen: (conversation: any) => void;
}) {
  if (props.conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground/60">Aucune conversation</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      {props.conversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          active={conversation.id === props.activeConversationId}
          myOrbitId={props.myOrbitId}
          onOpen={props.onOpen}
        />
      ))}
    </div>
  );
}
