import { useEffect } from "react";
import { useCallHistoryStore } from "@/stores/callHistoryStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video } from "lucide-react";

function formatDuration(sec: number) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ConversationCallHistory(props: { conversationId: string | null }) {
  const orbit = useOrbitStore((s: any) => s.profile);
  const hydrateConversationCalls = useCallHistoryStore((s) => s.hydrateConversationCalls);
  const items = useCallHistoryStore((s) => s.items);

  useEffect(() => {
    if (!props.conversationId) return;
    void hydrateConversationCalls(props.conversationId);
  }, [props.conversationId, hydrateConversationCalls]);

  if (!props.conversationId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Phone className="h-8 w-8 mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  const rows = items.filter((x) => x.conversation_id === props.conversationId);

  const getIcon = (call: typeof rows[0]) => {
    if (call.status === "missed") return <PhoneMissed className="h-4 w-4 text-destructive" />;
    if (call.call_type === "video") return <Video className="h-4 w-4 text-primary" />;
    if (call.direction === "incoming") return <PhoneIncoming className="h-4 w-4 text-success" />;
    return <PhoneOutgoing className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="flex flex-col gap-1 p-3">
      <h3 className="text-sm font-semibold text-foreground mb-2">Call History</h3>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No calls yet</p>
      ) : (
        rows.map((call) => {
          const isMine = call.caller_orbit_id === orbit?.orbitId;

          return (
            <div
              key={call.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/8 active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60">
                {getIcon(call)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {isMine ? "Outgoing" : "Incoming"}{" "}
                  {call.call_type === "video" ? "video" : "call"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {call.status === "missed" ? (
                    <span className="text-destructive font-medium">Missed</span>
                  ) : call.status === "rejected" ? (
                    <span className="text-destructive/70">Declined</span>
                  ) : (
                    <span>{formatDuration(call.duration_sec)}</span>
                  )}
                  <span className="mx-1.5 opacity-30">·</span>
                  {new Date(call.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
