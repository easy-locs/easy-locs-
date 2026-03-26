import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getTicketTypeLabel } from "@/lib/support/ticketTypes";
import { ArrowLeft, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SupportTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("requester_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/settings/support")}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">My Tickets</h1>
          <p className="text-xs text-muted-foreground">Track your support requests</p>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-3">
        {isLoading && [1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}

        {!isLoading && tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">No tickets yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
              Create a support request from tracking, orders, wallet or settings.
            </p>
          </div>
        )}

        {!isLoading && tickets.map((ticket: any) => (
          <button
            key={ticket.id}
            onClick={() => navigate(`/support/tickets/${ticket.id}`)}
            className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {ticket.subject || "Support request"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {getTicketTypeLabel(ticket.ticket_type)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
                {ticket.context_type && ticket.context_id && (
                  <p className="text-[10px] text-muted-foreground/70">
                    Linked: {ticket.context_type} · {String(ticket.context_id).slice(0, 8)}
                  </p>
                )}
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
          </button>
        ))}
      </div>
    </div>
  );
}
