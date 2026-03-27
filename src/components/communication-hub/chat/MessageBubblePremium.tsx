type Props = {
  message: {
    id: string;
    content: string;
    sender_id: string | null;
    created_at: string;
    read?: boolean;
    pending?: boolean;
    failed?: boolean;
    message_type?: string;
    reply_to_message_id?: string | null;
  };
  myUserId?: string | null;
};

export function MessageBubblePremium({ message, myUserId }: Props) {
  const mine = message.sender_id === myUserId;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[84%] rounded-2xl px-3 py-2 shadow-sm backdrop-blur-sm",
          mine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
        ].join(" ")}
      >
        {message.reply_to_message_id && (
          <div className="mb-2 rounded-lg bg-black/10 px-2 py-1 text-[11px] opacity-80">
            Reply
          </div>
        )}

        <div className="whitespace-pre-wrap break-words text-sm leading-5">
          {message.content}
        </div>

        <div className="mt-1 flex items-center justify-end gap-2 text-[11px] opacity-70">
          <span>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {mine && message.pending && <span>⏳</span>}
          {mine && message.failed && <span>⚠</span>}
          {mine && !message.pending && !message.failed && (
            <span>{message.read ? "✓✓" : "✓"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
