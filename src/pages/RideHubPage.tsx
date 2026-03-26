/**
 * RideHubPage — Customer ride hub.
 * Route: /ride
 * Actor: CUSTOMER only. Creates rides, tracks active trips, views history.
 * Driver/Rider controls are on /driver/live-missions.
 */
import { useEffect } from "react";
import { useCustomerRideStore } from "@/stores/customerRideStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { RideBookingForm } from "@/components/rides/RideBookingForm";
import { ArrowLeft, Car, Clock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function RideHubPage() {
  const navigate = useNavigate();
  const { jobs, loading, hydrateMyJobs } = useCustomerRideStore();

  useEffect(() => { hydrateMyJobs(); }, []);

  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const pastJobs = jobs.filter(j => ["completed", "cancelled"].includes(j.status));

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Rides</h1>
            <p className="text-xs text-muted-foreground">Book a ride or track active trips</p>
          </div>
          {activeJobs.length > 0 && (
            <Badge variant="default" className="ml-auto animate-pulse">{activeJobs.length} active</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <Tabs defaultValue={activeJobs.length > 0 ? "active" : "book"} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted/50 rounded-xl h-10">
            <TabsTrigger value="book" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Car className="h-3.5 w-3.5" /> Book
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clock className="h-3.5 w-3.5" /> Active
              {activeJobs.length > 0 && <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{activeJobs.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="mt-4">
            <RideBookingForm />
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeJobs.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No active rides</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Book a ride to get started</p>
              </div>
            ) : (
              activeJobs.map(j => <CustomerJobCard key={j.id} job={j} />)
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />)}
              </div>
            ) : pastJobs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No past rides</p>
              </div>
            ) : (
              pastJobs.slice(0, 20).map(j => (
                <div key={j.id} className="bg-card border border-border/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Ride</span>
                    <Badge variant={j.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                      {j.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">📍 {j.pickup_address}</p>
                  <p className="text-xs text-muted-foreground">🏁 {j.dropoff_address}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                    <span>{j.created_at ? new Date(j.created_at).toLocaleDateString() : "—"}</span>
                    {j.fare_amount != null && <span className="font-semibold text-foreground">{j.fare_amount} {j.currency}</span>}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
