import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-500",
  in_progress: "bg-green-500",
  completed: "bg-gray-400",
  cancelled_by_client: "bg-red-400",
  cancelled_by_provider: "bg-red-400",
  requested: "bg-amber-500",
};

export default function ProviderCalendarPage() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const from = weekStart.toISOString().split("T")[0];
  const to = weekEnd.toISOString().split("T")[0];

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["provider-calendar", user?.id, from, to],
    queryFn: async () => {
      const { data } = await db
        .from("service_bookings_v2")
        .select("*, service_catalog(title)")
        .eq("provider_id", user!.id)
        .gte("booked_date", from)
        .lte("booked_date", to)
        .order("booked_date")
        .order("start_time");
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split("T")[0],
      dayName: d.toLocaleDateString("en", { weekday: "short" }),
      dayNum: d.getDate(),
      isToday: d.toISOString().split("T")[0] === new Date().toISOString().split("T")[0],
    };
  });

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Calendar" icon={<Calendar className="h-5 w-5 text-primary" />} backTo="/provider/dashboard" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button size="icon" variant="ghost" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold">
            {weekStart.toLocaleDateString("en", { month: "short", day: "numeric" })} — {weekEnd.toLocaleDateString("en", { month: "short", day: "numeric" })}
          </p>
          <Button size="icon" variant="ghost" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1">
          {days.map(day => (
            <div
              key={day.date}
              className={`flex-1 text-center py-2 rounded-lg ${day.isToday ? "bg-primary text-primary-foreground" : "bg-muted/30"}`}
            >
              <p className="text-[10px] font-medium">{day.dayName}</p>
              <p className="text-sm font-bold">{day.dayNum}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {days.map(day => {
              const dayBookings = bookings.filter((b: any) => b.booked_date === day.date);
              if (dayBookings.length === 0) return null;
              return (
                <div key={day.date}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    {new Date(day.date).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                  <div className="space-y-1.5">
                    {dayBookings.map((bk: any) => (
                      <Card key={bk.id}>
                        <CardContent className="p-2.5 flex items-center gap-2">
                          <div className={`w-1 h-8 rounded-full ${STATUS_COLORS[bk.status] || "bg-gray-300"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold line-clamp-1">{bk.service_catalog?.title || "Service"}</p>
                            <p className="text-[10px] text-muted-foreground">{bk.start_time} - {bk.end_time}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px]">{bk.status.replace(/_/g, " ")}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
