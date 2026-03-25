import { useChatStore } from "@/stores/chatStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { useEffect, useRef } from "react";
import { Search, MessageCircle } from "lucide-react";
import { useState } from "react";
import { getConversationSubtitle, getConversationTitle } from "@/lib/chat/conversationUi";

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationList(props: {
  onOpen: (conversationId: string) => void;
  activeId?: string | null;
}) {
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);
  const orbit = useOrbitStore((s) => s.profile);
  const hydrateConversations = useChatStore((s) => s.hydrateConversations);
  const [search, setSearch] = useState("");
  const hydrated = useRef(false);

  useEffect(() => {
    if (!orbit?.orbitId || hydrated.current) return;
    hydrated.current = true;
    void hydrateConversations(orbit.orbitId);
  }, [orbit?.orbitId, hydrateConversations]);

  const sorted = [...conversations]
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.title ?? c.id).toLowerCase().includes(q);
    });

  const getLastMessage = (convId: string) => {
    const convMessages = messages
      .filter((m) => m.conversationId === convId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return convMessages[0];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-xl bg-muted/40 border-0 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 transition-shadow"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="h-10 w-10 mb-3 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/60">No conversations yet</p>
          </div>
        ) : (
          sorted.map((conv) => {
            const lastMsg = getLastMessage(conv.id);
            const isActive = props.activeId === conv.id;
            const displayName = getConversationTitle(conv, orbit?.orbitId || "");
            const subtitle = getConversationSubtitle(conv, orbit?.orbitId || "");
            const isMine = lastMsg?.senderOrbitId === orbit?.orbitId || lastMsg?.senderOrbitId === orbit?.id;

            return (
              <button
                key={conv.id}
                onClick={() => props.onOpen(conv.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors active:scale-[0.98] ${
                  isActive ? "bg-primary/8" : "hover:bg-muted/30"
                }`}
              >
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {getInitials(displayName)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {displayName}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60 tabular-nums shrink-0">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 truncate mt-0.5 leading-relaxed">
                    {lastMsg ? (
                      <>
                        {isMine && (
                          <span className="text-primary/60 mr-0.5">You: </span>
                        )}
                        {lastMsg.body}
                      </>
                    ) : (
                      <span className="italic">{subtitle || "No messages"}</span>
                    )}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
