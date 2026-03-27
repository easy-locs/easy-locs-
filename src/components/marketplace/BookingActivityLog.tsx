import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MessageCircle, CreditCard, Edit, Bell, FileText } from "lucide-react";
import { format } from "date-fns";

const ICON_MAP: Record<string, any> = {
  status_change: Edit,
  message: MessageCircle,
  payment: CreditCard,
  notification: Bell,
  invoice: FileText,
  default: Clock,
};

interface Props {
  bookingId: string;
  orgId: string;
}

export default function BookingActivityLog({ bookingId, orgId }: Props) {
  // Pull audit logs related to this booking
  const { data: logs = [] } = useQuery({
    queryKey: ["booking_audit", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      // Filter for this booking
      return (data || []).filter((l: any) => {
        const meta = l.metadata_json as any;
        return meta?.booking_id === bookingId;
      });
    },
    enabled: !!bookingId && !!orgId,
  });

  // Also pull notifications for this booking
  const { data: notifications = [] } = useQuery({
    queryKey: ["booking_notifications", bookingId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("app_notifications")
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).filter((n: any) => {
        const meta = n.metadata as any;
        return meta?.booking_id === bookingId;
      });
    },
    enabled: !!bookingId && !!orgId,
  });

  const timeline = [
    ...logs.map((l: any) => ({
      type: (l.metadata_json as any)?.event_type || "status_change",
      text: l.action,
      date: l.created_at,
    })),
    ...notifications.map((n: any) => ({
      type: "notification",
      text: `${n.title}: ${n.message}`,
      date: n.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (timeline.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No activity recorded yet
      </div>
    );
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
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(item.date), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
