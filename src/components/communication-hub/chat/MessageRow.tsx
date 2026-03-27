/**
 * MessageRow — Canonical V2+ message bubble component.
 * WhatsApp-style with pending/failed/read states.
 */

type Props = {
  message: {
    id: string;
    content: string;
    sender_id: string | null;
    created_at: string;
    read?: boolean;
    pending?: boolean;
    failed?: boolean;
  };
  myUserId?: string | null;
};

export function MessageRow({ message, myUserId }: Props) {
  const mine = message.sender_id === myUserId;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[82%] rounded-2xl px-3 py-2 shadow-sm",
          mine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
        ].join(" ")}
      >
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

export function TypingBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="px-3 py-1 text-xs text-muted-foreground animate-pulse">
      typing...
    </div>
  );
}
