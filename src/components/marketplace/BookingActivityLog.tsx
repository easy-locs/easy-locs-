import { useQuery } from "@tanstack/react-query";
import { Clock, MessageCircle, CreditCard, Edit, Bell, FileText } from "lucide-react";
import { format } from "date-fns";
import { fetchBookingAuditLogs, fetchBookingNotifications } from "@/repositories/marketplace.repository";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, any> = {
  status_change: Edit, message: MessageCircle, payment: CreditCard,
  notification: Bell, invoice: FileText, default: Clock,
};

interface Props { bookingId: string; orgId: string; }

export default function BookingActivityLog({ bookingId, orgId }: Props) {
  const { data: logs = [] } = useQuery({
    queryKey: ["booking_audit", bookingId],
    queryFn: () => fetchBookingAuditLogs(orgId, bookingId),
    enabled: !!bookingId && !!orgId,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["booking_notifications", bookingId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      return fetchBookingNotifications(user.id, bookingId);
    },
    enabled: !!bookingId && !!orgId,
  });

  const timeline = [
    ...logs.map((l: any) => ({ type: (l.metadata_json as any)?.event_type || "status_change", text: l.action, date: l.created_at })),
    ...notifications.map((n: any) => ({ type: "notification", text: `${n.title}: ${n.message}`, date: n.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (timeline.length === 0) {
    return <div className="text-center py-6 text-muted-foreground text-sm">No activity recorded yet</div>;
  }

  return (
    <div className="space-y-3">
      {timeline.map((item, i) => {
        const Icon = ICON_MAP[item.type] || ICON_MAP.default;
        return (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{item.text}</p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(item.date), "dd/MM/yyyy HH:mm")}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
