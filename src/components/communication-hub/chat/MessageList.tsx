/**
 * MessageList — Memoized message list with isolated render boundaries.
 * Hot-path optimized: filters memoized, callbacks stable, rows isolated.
 */
import { forwardRef, memo, useMemo, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isYesterday } from "date-fns";
import ChatMessageBubble, { DateSeparator } from "../ChatMessageBubble";
import DealStatusBubble, { type DealEventType } from "../DealStatusBubble";
import type { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
  rawCount: number;
  isDecrypting: boolean;
  typingIndicator: boolean;
  hiddenMsgIds: Set<string>;
  selectedMsgIds: Set<string>;
  selectMode: boolean;
  pendingOffline: { id: string }[];
  userId?: string;
  threadName?: string;
  locale: string;
  showOriginal: Record<string, boolean>;
  translatingMsgId: string | null;
  onTranslate: (msg: ChatMessage) => void;
  onContextMenu: (e: any, msg: ChatMessage, isMe: boolean) => void;
  onToggleSelect: (id: string) => void;
  getCategoryIcon: (cat: string) => string;
  t: (key: string) => string;
}

/** Stable pending-offline lookup set — avoids .some() per row */
function usePendingSet(pending: { id: string }[]) {
  return useMemo(() => new Set(pending.map(p => p.id)), [pending]);
}

const MessageList = memo(forwardRef<HTMLDivElement, Props>(({
  messages, rawCount, isDecrypting, typingIndicator, hiddenMsgIds,
  selectedMsgIds, selectMode, pendingOffline, userId, threadName, locale,
  showOriginal, translatingMsgId, onTranslate, onContextMenu, onToggleSelect,
  getCategoryIcon, t,
}, ref) => {
  const pendingSet = usePendingSet(pendingOffline);

  // Memoize filtered messages — only recomputes when messages or hiddenMsgIds change
  const filtered = useMemo(() => {
    return messages.filter(msg => {
      if (hiddenMsgIds.has(msg.id)) return false;
      if ((msg as any).deleted_for_sender && msg.sender_id === userId) return false;
      if (userId && ((msg as any).deleted_for_user_ids as string[] | null)?.includes(userId)) return false;
      return true;
    });
  }, [messages, hiddenMsgIds, userId]);

  // Precompute date labels once per filtered set
  const rowData = useMemo(() => {
    let lastDateStr = "";
    return filtered.map((msg, idx) => {
      const msgDate = new Date(msg.created_at);
      const dateStr = format(msgDate, "yyyy-MM-dd");
      const showDateSep = dateStr !== lastDateStr;
      lastDateStr = dateStr;
      const dateLabel = showDateSep
        ? (isToday(msgDate) ? "Today" : isYesterday(msgDate) ? "Yesterday" : format(msgDate, "dd/MM/yyyy"))
        : "";
      const isMe = msg.sender_id === userId;
      const prevMsg = idx > 0 ? filtered[idx - 1] : null;
      const isConsecutive = !!(prevMsg
        && prevMsg.sender_id === msg.sender_id
        && !showDateSep
        && prevMsg.message_type !== "system"
        && msg.message_type !== "system"
        && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) < 120000);
      return { msg, showDateSep, dateLabel, isMe, isConsecutive };
    });
  }, [filtered, userId]);

  // Stable context-menu handler that doesn't create new closures per row
  const handleContextMenu = useCallback((e: any, msg: ChatMessage, isMe: boolean) => {
    if (selectMode) { onToggleSelect(msg.id); return; }
    onContextMenu(e, msg, isMe);
  }, [selectMode, onContextMenu, onToggleSelect]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 pb-6" style={{ background: "hsl(var(--hud-bg))" }}>
      {isDecrypting && rawCount > 0 && messages.length === 0 ? (
        <div className="space-y-4 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div className="space-y-1.5" style={{ maxWidth: "75%" }}>
                {i % 2 === 0 && <Skeleton className="h-2.5 w-16" />}
                <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48 rounded-bl-md" : "w-40 rounded-br-md"}`} />
                <div className={`flex gap-1 ${i % 2 === 0 ? "" : "justify-end"}`}>
                  <Skeleton className="h-2 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)",
            }}>
              <MessageCircle className="h-7 w-7" style={{ color: "hsl(var(--hud-text-dim) / 0.25)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text))" }}>{t("orbit.no_messages") || "No messages yet"}</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{t("orbit.start_conversation") || "Start the conversation"}</p>
          </div>
        </div>
      ) : (
        rowData.map(({ msg, showDateSep, dateLabel, isMe, isConsecutive }) => (
          <div key={msg.id}>
            {showDateSep && <DateSeparator date={dateLabel} />}
            {msg.message_type === "deal_event" && (msg as any).metadata_json ? (
              <DealStatusBubble
                eventType={((msg as any).metadata_json?.event_type || "status_change") as DealEventType}
                data={(msg as any).metadata_json?.data || {}}
                createdAt={msg.created_at}
                actorRole={(msg as any).metadata_json?.actor_role}
              />
            ) : (
              <ChatMessageBubble
                msg={msg}
                isMe={isMe}
                isConsecutive={isConsecutive}
                threadName={threadName}
                locale={locale}
                showOriginal={!!showOriginal[msg.id]}
                translatingMsgId={translatingMsgId}
                isPendingOffline={pendingSet.has(msg.id)}
                selected={selectedMsgIds.has(msg.id)}
                selectMode={selectMode}
                currentUserId={userId}
                onTranslate={onTranslate}
                onContextMenu={handleContextMenu}
                onToggleSelect={onToggleSelect}
                getCategoryIcon={getCategoryIcon}
              />
            )}
          </div>
        ))
      )}
      {typingIndicator && (
        <div className="flex justify-start mt-1">
          <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ background: "hsl(var(--hud-surface-2))" }}>
            <div className="flex gap-1.5">
              {[0, 150, 300].map(d => (
                <span key={d} className="h-2 w-2 rounded-full animate-bounce" style={{ background: "hsl(var(--hud-cyan) / 0.4)", animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}));

MessageList.displayName = "MessageList";
export default MessageList;
