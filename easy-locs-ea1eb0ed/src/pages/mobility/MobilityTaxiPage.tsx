import { useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import * as repo from "@/repositories/mobility.repository";
import { Car, ArrowLeft, Clock, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TaxiSearchScreen } from "@/components/mobility/TaxiSearchScreen";
import { TaxiPreviewScreen } from "@/components/mobility/TaxiPreviewScreen";
import { TaxiRequestingScreen } from "@/components/mobility/TaxiRequestingScreen";
import { TaxiTrackingScreen } from "@/components/mobility/TaxiTrackingScreen";
import { TaxiCompletedScreen } from "@/components/mobility/TaxiCompletedScreen";
import { TaxiStepIndicator } from "@/components/mobility/TaxiStepIndicator";
import { AnimatePresence, motion } from "framer-motion";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MobilityTaxiPage() {
  useUiEngine("mobility-mobilitytaxipage");
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
  const inFlow = step !== "search";

  return (
    <SubPageShell noContentPad className="bg-background pb-[120px]" style={{ paddingTop: "max(8px, env(safe-area-inset-top, 0px))" }}>
      <header className="sticky top-0 z-20 backdrop-blur-xl flex items-center gap-3 px-4 pt-3 pb-2" style={{ background: "hsl(226 24% 14% / 0.95)" }}>
        <button
          onClick={() => inFlow ? reset() : (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(0 0% 100% / 0.1)" }}
        >
          <ArrowLeft className="w-4.5 h-4.5 text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Car className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--accent))" }} />
          <h1 className="text-lg font-bold text-white tracking-tight">Taxi</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0" style={{ background: "hsl(142 71% 45% / 0.15)" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(142 71% 45%)" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(142 71% 45%)" }}>0% Fees</span>
        </div>
      </header>

      {inFlow && (
        <div className="px-4 pt-2">
          <TaxiStepIndicator step={step} />
        </div>
      )}

      <div className="px-4 mt-3">
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
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  useTaxiFlowStore.getState().setActiveJobId(activeJobs[0].id);
                  useTaxiFlowStore.getState().setStep("tracking");
                }}
                className="mb-4 w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform"
                style={{ background: "hsl(226 24% 14%)", border: "1px solid hsl(var(--accent) / 0.3)" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.15)" }}>
                  <Navigation className="h-4.5 w-4.5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-white">{activeJobs.length} active ride{activeJobs.length > 1 ? "s" : ""}</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--accent) / 0.8)" }}>Tap to track your ride</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-xs font-bold" style={{ color: "hsl(var(--accent))" }}>LIVE</span>
                </div>
              </motion.button>
            )}

            <TaxiSearchScreen />
          </>
        )}
      </div>
    </SubPageShell>
  );
}
