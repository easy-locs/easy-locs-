/**
 * RideHubPage — Main ride booking + tracking hub.
 * Route: /ride
 */
import { useState } from "react";
import { useMyRides } from "@/hooks/useRides";
import { RideBookingForm } from "@/components/rides/RideBookingForm";
import { RideLiveCard } from "@/components/rides/RideLiveCard";
import { DriverOpenRidesPanel } from "@/components/rides/DriverOpenRidesPanel";
import { ArrowLeft, Car, Clock, CheckCircle2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function RideHubPage() {
  const navigate = useNavigate();
  const { data: rides, isLoading } = useMyRides();

  const activeRides = (rides ?? []).filter(r => !["completed", "cancelled", "failed"].includes(r.status));
  const pastRides = (rides ?? []).filter(r => ["completed", "cancelled", "failed"].includes(r.status));

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Rides</h1>
            <p className="text-xs text-muted-foreground">Book a ride or track active trips</p>
          </div>
          {activeRides.length > 0 && (
            <Badge variant="default" className="ml-auto animate-pulse">{activeRides.length} active</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <Tabs defaultValue={activeRides.length > 0 ? "active" : "book"} className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-muted/50 rounded-xl h-10">
            <TabsTrigger value="book" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Car className="h-3.5 w-3.5" /> Book
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clock className="h-3.5 w-3.5" /> Active
              {activeRides.length > 0 && <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{activeRides.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" /> History
            </TabsTrigger>
            <TabsTrigger value="driver" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-3.5 w-3.5" /> Driver
            </TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="mt-4">
            <RideBookingForm />
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeRides.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No active rides</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Book a ride to get started</p>
              </div>
            ) : (
              activeRides.map(r => <RideLiveCard key={r.id} rideId={r.id} />)
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />)}
              </div>
            ) : pastRides.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No past rides</p>
              </div>
            ) : (
              pastRides.slice(0, 20).map(r => (
                <div key={r.id} className="bg-card border border-border/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground capitalize">{r.ride_type}</span>
                    <Badge variant={r.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">📍 {r.pickup_label}</p>
                  <p className="text-xs text-muted-foreground">🏁 {r.dropoff_label}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    {r.final_price != null && <span className="font-semibold text-foreground">{r.final_price} {r.currency}</span>}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="driver" className="mt-4">
            <DriverOpenRidesPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
