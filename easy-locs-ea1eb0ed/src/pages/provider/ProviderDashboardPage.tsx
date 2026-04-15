import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { serviceUseCases } from "@/domains/services/service";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, DollarSign, Bell, Play, CheckCircle, XCircle,
  Loader2, Briefcase, TrendingUp, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled_by_client: "bg-red-100 text-red-800",
  cancelled_by_provider: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ProviderDashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: dashboard } = useQuery({
    queryKey: ["provider-dashboard", user?.id],
    queryFn: () => serviceUseCases.getProviderDashboard(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const today = new Date().toISOString().split("T")[0];

  const { data: todayBookings = [] } = useQuery({
    queryKey: ["provider-today-bookings", user?.id],
    queryFn: async () => {
      const { data } = await db
        .from("service_bookings_v2")
        .select("*, service_catalog(title, duration_minutes)")
        .eq("provider_id", user!.id)
        .eq("booked_date", today)
        .not("status", "in", '("cancelled_by_client","cancelled_by_provider","rejected")')
        .order("start_time");
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["provider-pending", user?.id],
    queryFn: async () => {
      const { data } = await db
        .from("service_bookings_v2")
        .select("*, service_catalog(title)")
        .eq("provider_id", user!.id)
        .eq("status", "requested")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const handleAction = async (bookingId: string, action: string) => {
    try {
      if (action === "confirm") await serviceUseCases.confirmBooking(bookingId);
      else if (action === "reject") await serviceUseCases.rejectBooking(bookingId, "Provider unavailable");
      else if (action === "start") await serviceUseCases.startService(bookingId);
      else if (action === "complete") await serviceUseCases.completeService(bookingId);
      qc.invalidateQueries({ queryKey: ["provider-dashboard"] });
      qc.invalidateQueries({ queryKey: ["provider-today-bookings"] });
      qc.invalidateQueries({ queryKey: ["provider-pending"] });
      toast.success(`Booking ${action}ed`);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Provider Dashboard" icon={<Briefcase className="h-5 w-5 text-primary" />} backTo="/me" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{dashboard?.todayBookings || 0}</p>
              <p className="text-[10px] text-muted-foreground">Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Bell className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{dashboard?.pendingRequests || 0}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{dashboard?.weekRevenue || 0}</p>
              <p className="text-[10px] text-muted-foreground">Week Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{dashboard?.monthRevenue || 0}</p>
              <p className="text-[10px] text-muted-foreground">Month Revenue</p>
            </CardContent>
          </Card>
        </div>

        {dashboard?.nextAppointment && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-primary mb-1">Next Appointment</p>
              <p className="text-sm font-bold">{dashboard.nextAppointment.service_catalog?.title || "Service"}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(dashboard.nextAppointment.booked_date).toLocaleDateString()} at {dashboard.nextAppointment.start_time}
              </p>
            </CardContent>
          </Card>
        )}

        {pendingRequests.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-2">Pending Requests</h3>
            <div className="space-y-2">
              {pendingRequests.map((req: any) => (
                <Card key={req.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{req.service_catalog?.title || "Service"}</p>
                      <Badge className="text-[10px] bg-amber-100 text-amber-800">New</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.booked_date).toLocaleDateString()} at {req.start_time}
                    </p>
                    {req.client_notes && <p className="text-xs text-muted-foreground italic">"{req.client_notes}"</p>}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 gap-1 h-8" onClick={() => handleAction(req.id, "confirm")}>
                        <CheckCircle className="h-3 w-3" /> Confirm
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 gap-1 h-8" onClick={() => handleAction(req.id, "reject")}>
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold mb-2">Today's Schedule</h3>
          {todayBookings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No bookings today</p>
          ) : (
            <div className="space-y-2">
              {todayBookings.map((bk: any) => (
                <Card key={bk.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{bk.service_catalog?.title || "Service"}</p>
                      <p className="text-xs text-muted-foreground">{bk.start_time} - {bk.end_time}</p>
                      <Badge className={`text-[10px] ${STATUS_COLORS[bk.status] || ""}`}>{bk.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {bk.status === "confirmed" && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => handleAction(bk.id, "start")}>
                          <Play className="h-3 w-3" /> Start
                        </Button>
                      )}
                      {bk.status === "in_progress" && (
                        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => handleAction(bk.id, "complete")}>
                          <CheckCircle className="h-3 w-3" /> Done
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link to="/provider/calendar">
            <Button variant="outline" className="w-full h-10 text-xs gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Calendar
            </Button>
          </Link>
          <Link to="/provider/services">
            <Button variant="outline" className="w-full h-10 text-xs gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> My Services
            </Button>
          </Link>
          <Link to="/provider/availability">
            <Button variant="outline" className="w-full h-10 text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Availability
            </Button>
          </Link>
          <Link to="/provider/earnings">
            <Button variant="outline" className="w-full h-10 text-xs gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Earnings
            </Button>
          </Link>
        </div>
      </div>
    </SubPageShell>
  );
}
