import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTicketMessages, sendTicketMessage } from "@/lib/support/supportThread";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function SupportThread({
  ticketId,
  actorRole = "client",
  showInternal = false,
}: {
  ticketId: string;
  actorRole?: "client" | "admin" | "merchant" | "driver" | "system";
  showInternal?: boolean;
}) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");

  const { data: messages = [], refetch, isLoading } = useQuery({
    queryKey: ["support-thread", ticketId, showInternal],
    queryFn: async () => {
      const rows = await listTicketMessages(ticketId);
      return showInternal ? rows : rows.filter((m: any) => !m.metadata?.internal);
    },
    enabled: !!ticketId,
    staleTime: 5000,
  });

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      await sendTicketMessage({
        ticketId,
        senderUserId: user?.id ?? null,
        senderRole: actorRole,
        body: message.trim(),
      });
      setMessage("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not send message");
    }
  };

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Conversation</p>

      {isLoading && <Skeleton className="h-16 rounded-xl" />}

      {!isLoading && messages.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
      )}

      {!isLoading && messages.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {messages.map((row: any) => {
            const mine = row.sender_user_id && row.sender_user_id === user?.id;
            const systemLike = row.sender_role === "admin" || row.sender_role === "system";

            return (
              <div
                key={row.id}
                className={`rounded-xl p-3 text-sm space-y-1 ${
                  mine ? "bg-primary/10 ml-6" : systemLike ? "bg-muted mr-6" : "bg-muted mr-6"
                }`}
              >
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {row.sender_role}
                  {row.metadata?.internal ? " · internal" : ""}
                </p>
                <p className="text-foreground">{row.body}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Write a reply..."
          className="flex-1 rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none"
        />
        <button
          onClick={handleSend}
          className="self-end rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold"
        >
          Send
        </button>
      </div>
    </div>
  );
}
