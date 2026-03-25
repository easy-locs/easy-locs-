import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTicketTypeLabel } from "@/lib/support/ticketTypes";
import { ArrowLeft, Image } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SupportThread from "@/components/support/SupportThread";

export default function SupportTicketDetailPage() {
  const navigate = useNavigate();
  const { ticketId } = useParams();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["support-ticket-detail", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/support/tickets")}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Ticket Detail</h1>
          <p className="text-xs text-muted-foreground">
            {ticketId ? `#${ticketId.slice(0, 8)}` : ""}
          </p>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-4">
        {isLoading && <Skeleton className="h-40 rounded-2xl" />}

        {!isLoading && !ticket && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-semibold text-foreground">Ticket not found</p>
            <button
              onClick={() => navigate("/support/tickets")}
              className="mt-3 text-sm font-semibold text-primary"
            >
              Back to tickets
            </button>
          </div>
        )}

        {!isLoading && ticket && (
          <>
            {/* Summary card */}
            <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {ticket.subject || "Support request"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{
                    color: ticket.status === "resolved" ? "hsl(142 70% 45%)" : ticket.status === "pending" ? "hsl(45 90% 55%)" : "hsl(200 80% 55%)",
                    background: ticket.status === "resolved" ? "hsl(142 70% 45% / 0.12)" : ticket.status === "pending" ? "hsl(45 90% 55% / 0.12)" : "hsl(200 80% 55% / 0.12)",
                  }}
                >
                  {ticket.status || "open"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Issue type: <span className="font-semibold text-foreground">{getTicketTypeLabel(ticket.ticket_type)}</span>
              </p>

              {ticket.context_type && ticket.context_id && (
                <p className="text-xs text-muted-foreground">
                  Context: {ticket.context_type} · {String(ticket.context_id)}
                </p>
              )}
            </div>

            {/* Evidence placeholder */}
            <div className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-bold text-foreground">Evidence</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Evidence attachments will appear here.
              </p>
            </div>

            {/* Thread */}
            <SupportThread ticketId={ticketId!} actorRole="client" />
          </>
        )}
      </div>
    </div>
  );
}
