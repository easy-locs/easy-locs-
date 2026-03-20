import { DefaultMessageBubble } from "@/components/chat/DefaultMessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { CallButton } from "@/components/call/CallButton";
import { getConversationTitle, getConversationSubtitle } from "@/lib/chat/conversationUi";
import { ArrowLeft } from "lucide-react";

export function ChatThreadPanel(props: {
  conversation: any | null;
  peer: any | null;
  messages: any[];
  myOrbitId: string;
  onSendMessage: (text: string) => Promise<void> | void;
  onBack?: () => void;
}) {
  if (!props.conversation || !props.peer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground/50">Sélectionne un chat</p>
      </div>
    );
  }

  const title = getConversationTitle(props.conversation, props.myOrbitId);
  const subtitle = getConversationSubtitle(props.conversation, props.myOrbitId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-border/30 bg-card">
        {props.onBack && (
          <button
            onClick={props.onBack}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-accent/10 active:scale-[0.95] transition-all"
          >
            <ArrowLeft className="h-5 w-5 text-foreground/70" />
          </button>
        )}

        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
          {title.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground/70 truncate">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <CallButton orbitId={props.peer.orbit_id ?? props.peer.orbitId} type="audio" conversationId={props.conversation.id} />
          <CallButton orbitId={props.peer.orbit_id ?? props.peer.orbitId} type="video" conversationId={props.conversation.id} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
        {props.messages.map((msg: any) => (
          <DefaultMessageBubble
            key={msg.id}
            mine={msg.sender_orbit_id === props.myOrbitId}
            body={msg.body}
            createdAt={msg.created_at}
          />
        ))}
      </div>

      {/* Composer */}
      <MessageComposer onSend={props.onSendMessage} />
    </div>
  );
}
