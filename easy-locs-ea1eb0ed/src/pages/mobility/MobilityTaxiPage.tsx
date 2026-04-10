import { useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import * as repo from "@/repositories/mobility.repository";
import { Car, Clock, CheckCircle2, ArrowLeft, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function statusColor(s: string) {
  if (s === "completed") return "bg-emerald-500/10 text-emerald-600";
  if (s === "cancelled") return "bg-red-500/10 text-red-500";
  return "bg-muted text-muted-foreground";
}

function statusLabel(s: string) {
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  if (s === "failed_no_rider") return "No driver found";
  if (s === "expired") return "Expired";
  return s.replace(/_/g, " ");
}

export default function MobilityTaxiPage() {
  const navigate = useNavigate();
  const { jobs, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const { step, reset } = useTaxiFlowStore();

  useEffect(() => { hydrateMyJobs(); }, []);
  useEffect(() => () => { reset(); }, []);

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
    <div className="flex flex-col bg-background" style={{ minHeight: "100dvh", paddingTop: "max(8px, env(safe-area-inset-top, 0px))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <button onClick={() => inFlow ? reset() : (window.history.length > 1 ? navigate(-1) : navigate("/"))} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Car className="w-5 h-5 text-primary shrink-0" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">Taxi</h1>
        </div>
        <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 uppercase tracking-wider shrink-0 whitespace-nowrap">
          0% Fees
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 24px)" }}>
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
                <TabsTrigger value="book" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all"><Car className="h-3.5 w-3.5 shrink-0" /> Book</TabsTrigger>
                <TabsTrigger value="active" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all"><Clock className="h-3.5 w-3.5 shrink-0" /> Active</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> History</TabsTrigger>
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
                  <div key={j.id} className="rounded-2xl border border-border/15 bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4 text-foreground/60" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">Taxi Ride</p>
                          <p className="text-[10px] text-muted-foreground">
                            {j.service_level?.replace(/_/g, " ") || "Standard"}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0", statusColor(j.status))}>
                        {statusLabel(j.status)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-4 flex flex-col items-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <div className="w-px h-3 bg-border" />
                        </div>
                        <p className="text-xs text-foreground leading-snug min-w-0 break-words">{j.pickup_label || j.pickup_address || "Pickup location"}</p>
                      </div>
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <p className="text-xs text-foreground leading-snug min-w-0 break-words">{j.dropoff_label || j.dropoff_address || "Dropoff location"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1 border-t border-border/10">
                      {j.current_price != null && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-bold text-foreground">{j.current_price} {j.currency}</span>
                        </div>
                      )}
                      {j.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{formatDate(j.created_at)}</span>
                        </div>
                      )}
                      {j.created_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{formatTime(j.created_at)}</span>
                        </div>
                      )}
                    </div>
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
