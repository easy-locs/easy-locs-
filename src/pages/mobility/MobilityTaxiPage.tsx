/**
 * MobilityTaxiPage — /mobility/taxi — CUSTOMER ONLY taxi booking.
 * 5-step Careem/Uber flow: Search → Preview → Requesting → Tracking → Completed.
 */
import { useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { supabase } from "@/integrations/supabase/client";
import { Car, Clock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MobileHeroHeader } from "@/components/layout/MobileHeroHeader";
import { PageEmptyState } from "@/components/ui/PageEmptyState";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { TaxiSearchScreen } from "@/components/mobility/TaxiSearchScreen";
import { TaxiPreviewScreen } from "@/components/mobility/TaxiPreviewScreen";
import { TaxiRequestingScreen } from "@/components/mobility/TaxiRequestingScreen";
import { TaxiTrackingScreen } from "@/components/mobility/TaxiTrackingScreen";
import { TaxiCompletedScreen } from "@/components/mobility/TaxiCompletedScreen";
import { AnimatePresence } from "framer-motion";

export default function MobilityTaxiPage() {
  const navigate = useNavigate();
  const { jobs, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const { step, reset } = useTaxiFlowStore();

  useEffect(() => { hydrateMyJobs(); }, []);
  useEffect(() => () => { reset(); }, []);

  // Realtime
  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ch = supabase
        .channel(`taxi-jobs:${user.id}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "mobility_jobs",
          filter: `customer_user_id=eq.${user.id}`,
        }, (payload: any) => {
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

  // Show flow screens when in booking flow (not search)
  const inFlow = step !== "search";

  return (
    <div className="app-mobile-page bg-background">
      <MobileHeroHeader
        title="Taxi"
        subtitle="Book a ride now or later"
        icon={<span>🚕</span>}
        onBack={() => inFlow ? reset() : navigate(-1)}
      />

      <div className="px-4 py-4 app-mobile-content">
        {/* If in booking flow (preview/requesting/tracking/completed), show only the flow */}
        {inFlow ? (
          <AnimatePresence mode="wait">
            {step === "preview" && <TaxiPreviewScreen />}
            {step === "requesting" && <TaxiRequestingScreen />}
            {step === "tracking" && <TaxiTrackingScreen />}
            {step === "completed" && <TaxiCompletedScreen />}
          </AnimatePresence>
        ) : (
          <>
            {activeJobs.length > 0 && (
              <div className="mb-3 flex justify-end">
                <Badge
                  variant="default"
                  className="animate-pulse cursor-pointer"
                  onClick={() => {
                    const job = activeJobs[0];
                    useTaxiFlowStore.getState().setActiveJobId(job.id);
                    useTaxiFlowStore.getState().setStep("tracking");
                  }}
                >
                  {activeJobs.length} active ride{activeJobs.length > 1 ? "s" : ""}
                </Badge>
              </div>
            )}

            <Tabs defaultValue={activeJobs.length > 0 ? "active" : "book"} className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-muted/50 rounded-xl h-11">
                <TabsTrigger value="book" className="rounded-lg text-xs font-semibold gap-1.5">
                  <Car className="h-3.5 w-3.5" /> Book
                </TabsTrigger>
                <TabsTrigger value="active" className="rounded-lg text-xs font-semibold gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Active
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="book" className="mt-4">
                <TaxiSearchScreen />
              </TabsContent>

              <TabsContent value="active" className="mt-4 space-y-3">
                {activeJobs.length === 0 ? (
                  <PageEmptyState
                    icon={<span>🚕</span>}
                    title="No active taxi rides"
                    description="Your current rides will appear here"
                  />
                ) : activeJobs.map(j => <CustomerJobCard key={j.id} job={j} />)}
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-3">
                {pastJobs.length === 0 ? (
                  <PageEmptyState
                    icon={<span>✅</span>}
                    title="No past rides"
                    description="Your ride history will appear here"
                  />
                ) : pastJobs.slice(0, 20).map(j => (
                  <div key={j.id} className="bg-card border border-border/30 rounded-xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Taxi</span>
                      <Badge variant={j.status === "completed" ? "default" : "secondary"} className="text-[10px]">{j.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">📍 {j.pickup_label || j.pickup_address}</p>
                    <p className="text-xs text-muted-foreground truncate">🏁 {j.dropoff_label || j.dropoff_address}</p>
                    {j.current_price != null && <p className="text-xs font-semibold text-foreground">{j.current_price} {j.currency}</p>}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
