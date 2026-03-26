/**
 * MobilityTaxiPage — /mobility/taxi — CUSTOMER ONLY taxi booking.
 * Strict actor separation: no delivery, no rider UI.
 */
import { useEffect } from "react";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Car, Clock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TaxiBookingForm } from "@/components/mobility/TaxiBookingForm";

export default function MobilityTaxiPage() {
  const navigate = useNavigate();
  const { jobs, loading, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();

  useEffect(() => { hydrateMyJobs(); }, []);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ch = supabase
        .channel(`taxi-jobs:${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs", filter: `customer_user_id=eq.${user.id}` }, (payload: any) => {
          if (payload.new?.id) refreshJob(payload.new.id);
        })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    };
    const cleanup = setup();
    return () => { cleanup.then(fn => fn?.()); };
  }, []);

  const taxiJobs = jobs.filter(j => j.job_type === "taxi");
  const activeJobs = taxiJobs.filter(j => !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status));
  const pastJobs = taxiJobs.filter(j => ["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status));

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Taxi</h1>
            <p className="text-xs text-muted-foreground">Book a ride now or later</p>
          </div>
          {activeJobs.length > 0 && <Badge variant="default" className="ml-auto animate-pulse">{activeJobs.length} active</Badge>}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <Tabs defaultValue={activeJobs.length > 0 ? "active" : "book"} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted/50 rounded-xl h-10">
            <TabsTrigger value="book" className="rounded-lg text-xs font-semibold gap-1.5"><Car className="h-3.5 w-3.5" /> Book</TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg text-xs font-semibold gap-1.5"><Clock className="h-3.5 w-3.5" /> Active</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> History</TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="mt-4">
            <TaxiBookingForm />
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeJobs.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No active taxi rides</p>
              </div>
            ) : activeJobs.map(j => <CustomerJobCard key={j.id} job={j} />)}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {pastJobs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No past rides</p>
              </div>
            ) : pastJobs.slice(0, 20).map(j => (
              <div key={j.id} className="bg-card border border-border/30 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Taxi</span>
                  <Badge variant={j.status === "completed" ? "default" : "secondary"} className="text-[10px]">{j.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">📍 {j.pickup_label || j.pickup_address}</p>
                <p className="text-xs text-muted-foreground">🏁 {j.dropoff_label || j.dropoff_address}</p>
                {j.current_price != null && <p className="text-xs font-semibold text-foreground">{j.current_price} {j.currency}</p>}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
