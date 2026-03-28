type Thread = {
  id: string;
  name: string;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
  avatarUrl?: string | null;
};

type Props = {
  threads: Thread[];
  selectedThreadId?: string | null;
  onSelect: (thread: Thread) => void;
};

export function OrbitThreadListV2({
  threads,
  selectedThreadId,
  onSelect,
}: Props) {
  return (
    <div className="space-y-1">
      {threads.map((thread) => {
        const active = selectedThreadId === thread.id;

        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread)}
            className={[
              "w-full rounded-2xl border border-border px-3 py-3 text-left transition",
              active ? "bg-muted" : "hover:bg-muted/50",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted overflow-hidden">
                {thread.avatarUrl ? (
                  <img src={thread.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground line-clamp-1 break-words">{thread.name}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {thread.lastMessageTime
                      ? new Date(thread.lastMessageTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground line-clamp-1 break-words">
                    {thread.lastMessage || ""}
                  </p>

                  {!!thread.unreadCount && (
                    <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary text-primary-foreground px-1 text-[11px] font-semibold shrink-0">
                      {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
