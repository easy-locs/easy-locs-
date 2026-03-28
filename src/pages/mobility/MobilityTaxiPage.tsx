/**
 * MobilityTaxiPage — /mobility/taxi — CUSTOMER taxi booking.
 * All DB access via mobility.repository + customerMobilityStore.
 */
import { useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import * as repo from "@/repositories/mobility.repository";
import { Car, Clock, CheckCircle2, MapPin, Navigation2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileHeroHeader } from "@/components/layout/MobileHeroHeader";
import { PageEmptyState } from "@/components/ui/PageEmptyState";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { TaxiSearchScreen } from "@/components/mobility/TaxiSearchScreen";
import { TaxiPreviewScreen } from "@/components/mobility/TaxiPreviewScreen";
import { TaxiRequestingScreen } from "@/components/mobility/TaxiRequestingScreen";
import { TaxiTrackingScreen } from "@/components/mobility/TaxiTrackingScreen";
import { TaxiCompletedScreen } from "@/components/mobility/TaxiCompletedScreen";
import { TaxiStepIndicator } from "@/components/mobility/TaxiStepIndicator";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function MobilityTaxiPage() {
  const navigate = useNavigate();
  const { jobs, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const { step, reset } = useTaxiFlowStore();

  useEffect(() => { hydrateMyJobs(); }, []);
  useEffect(() => () => { reset(); }, []);

  // Realtime
  useEffect(() => {
    const setup = async () => {
      const userId = await repo.getCurrentUserId();
      if (!userId) return;
      const ch = repo.subscribeToTable(
        `taxi-jobs:${userId}`, "mobility_jobs",
        `customer_user_id=eq.${userId}`,
        (payload: any) => { if (payload.new?.id) refreshJob(payload.new.id); }
      );
      return () => { repo.unsubscribeChannel(ch); };
    };
    const cleanup = setup();
    return () => { cleanup.then(fn => fn?.()); };
  }, []);

  const taxiJobs = jobs.filter(j => j.job_type === "taxi");
  const activeJobs = taxiJobs.filter(j => !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status));
  const pastJobs = taxiJobs.filter(j => ["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status));
  const inFlow = step !== "search";

  return (
    <div className="app-mobile-page bg-background">
      <MobileHeroHeader title="Taxi" subtitle="Book a ride now or later"
        icon={<Car className="h-6 w-6 text-primary-foreground" />}
        onBack={() => inFlow ? reset() : navigate(-1)} />

      <div className="px-4 py-4 app-mobile-content overflow-x-hidden">
        {inFlow ? (
          <div className="space-y-4">
            <TaxiStepIndicator step={step} />
            <AnimatePresence mode="wait">
              {step === "preview" && <TaxiPreviewScreen />}
              {step === "requesting" && <TaxiRequestingScreen />}
              {step === "tracking" && <TaxiTrackingScreen />}
              {step === "completed" && <TaxiCompletedScreen />}
            </AnimatePresence>
          </div>
        ) : (
          <>
            {activeJobs.length > 0 && (
              <button onClick={() => { useTaxiFlowStore.getState().setActiveJobId(activeJobs[0].id); useTaxiFlowStore.getState().setStep("tracking"); }}
                className="mb-4 w-full flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 active:scale-[0.98] transition-transform">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0"><Car className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold text-primary">{activeJobs.length} active ride{activeJobs.length > 1 ? "s" : ""}</p>
                  <p className="text-[10px] text-muted-foreground">Tap to track</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              </button>
            )}

            <Tabs defaultValue={activeJobs.length > 0 ? "active" : "book"} className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-card/60 border border-border/15 rounded-2xl h-11 p-1">
                <TabsTrigger value="book" className="rounded-xl text-[11px] font-bold gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all"><Car className="h-3.5 w-3.5 shrink-0" /> Book</TabsTrigger>
                <TabsTrigger value="active" className="rounded-xl text-[11px] font-bold gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all"><Clock className="h-3.5 w-3.5 shrink-0" /> Active</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl text-[11px] font-bold gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> History</TabsTrigger>
              </TabsList>
              <TabsContent value="book" className="mt-4"><TaxiSearchScreen /></TabsContent>
              <TabsContent value="active" className="mt-4 space-y-3">
                {activeJobs.length === 0 ? (
                  <PageEmptyState icon={<Car className="h-6 w-6 text-muted-foreground" />} title="No active rides" description="Your current rides will appear here" />
                ) : activeJobs.map(j => <CustomerJobCard key={j.id} job={j} />)}
              </TabsContent>
              <TabsContent value="history" className="mt-4 space-y-3">
                {pastJobs.length === 0 ? (
                  <PageEmptyState icon={<CheckCircle2 className="h-6 w-6 text-muted-foreground" />} title="No past rides" description="Your ride history will appear here" />
                ) : pastJobs.slice(0, 20).map(j => (
                  <div key={j.id} className="rounded-2xl border border-border/15 bg-card/40 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">Taxi</span>
                      <span className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide", j.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>{j.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground break-words leading-snug flex items-center gap-1.5"><MapPin className="h-3 w-3 text-emerald-500 shrink-0" /> {j.pickup_label || j.pickup_address}</p>
                    <p className="text-xs text-muted-foreground break-words leading-snug flex items-center gap-1.5"><Navigation2 className="h-3 w-3 text-primary shrink-0" /> {j.dropoff_label || j.dropoff_address}</p>
                    {j.current_price != null && <p className="text-sm font-bold text-foreground">{j.current_price} {j.currency}</p>}
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
