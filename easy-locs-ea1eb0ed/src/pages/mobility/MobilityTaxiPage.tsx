import { useEffect, useState } from "react";
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
import { AnimatePresence, motion } from "framer-motion";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilityLiveMap } from "@/components/mobility/MobilityLiveMap";
import TaxiBottomSheet, { type TaxiSnapPoint } from "@/components/mobility/TaxiBottomSheet";
import { preloadMapLibre } from "@/lib/maplibre/maplibre-loader";

export default function MobilityTaxiPage() {
  useUiEngine("mobility-mobilitytaxipage");
  const navigate = useNavigate();
  const { jobs, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const { step, pickup, dropoff, reset } = useTaxiFlowStore();
  const [sheetSnap, setSheetSnap] = useState<TaxiSnapPoint>("half");
  const [viewportHeight, setViewportHeight] = useState(() => typeof window !== "undefined" ? window.innerHeight : 800);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { preloadMapLibre(); }, []);
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
  const isMapStep = step === "search" || step === "preview";
  const canContinue = !!pickup && !!dropoff;

  const mapPickupLat = pickup?.lat ?? undefined;
  const mapPickupLng = pickup?.lng ?? undefined;
  const mapDropoffLat = canContinue ? dropoff?.lat : undefined;
  const mapDropoffLng = canContinue ? dropoff?.lng : undefined;

  if (!isMapStep) {
    return (
      <SubPageShell noContentPad className="bg-background pb-[120px]" style={{ paddingTop: "max(8px, env(safe-area-inset-top, 0px))" }}>
        <header className="sticky top-0 z-20 backdrop-blur-xl flex items-center gap-3 px-4 pt-3 pb-2" style={{ background: "hsl(226 24% 14% / 0.95)" }}>
          <button
            onClick={() => reset()}
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
            <span className="text-[0.625rem] font-bold uppercase tracking-wider" style={{ color: "hsl(142 71% 45%)" }}>0% Fees</span>
          </div>
        </header>

        <div className="px-4 mt-3">
          <AnimatePresence mode="wait">
            {step === "requesting" && <TaxiRequestingScreen />}
            {step === "tracking" && <TaxiTrackingScreen />}
            {step === "completed" && <TaxiCompletedScreen />}
          </AnimatePresence>
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell
      fullScreen
      noContentPad
      className="bg-background"
      style={{ paddingTop: 0, height: "100dvh", minHeight: "100dvh" }}
    >
      <MobilityLiveMap
        mode="taxi"
        nearbyRiders={5}
        fullScreen
        pickupLat={mapPickupLat}
        pickupLng={mapPickupLng}
        dropoffLat={mapDropoffLat}
        dropoffLng={mapDropoffLng}
        bottomPadding={sheetSnap === "peek" ? 220 : sheetSnap === "half" ? viewportHeight * 0.55 : viewportHeight * 0.85}
      />

      <header
        className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 pb-2"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
          background: "linear-gradient(to bottom, hsl(226 24% 10% / 0.85) 0%, hsl(226 24% 10% / 0.4) 70%, transparent 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <button
          onClick={() => inFlow ? reset() : (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(0 0% 100% / 0.12)", backdropFilter: "blur(8px)" }}
        >
          <ArrowLeft className="w-4.5 h-4.5 text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Car className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--accent))" }} />
          <h1 className="text-lg font-bold text-white tracking-tight">Taxi</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0" style={{ background: "hsl(142 71% 45% / 0.15)", backdropFilter: "blur(8px)" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(142 71% 45%)" }} />
          <span className="text-[0.625rem] font-bold uppercase tracking-wider" style={{ color: "hsl(142 71% 45%)" }}>0% Fees</span>
        </div>
      </header>

      {activeJobs.length > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            useTaxiFlowStore.getState().setActiveJobId(activeJobs[0].id);
            useTaxiFlowStore.getState().setStep("tracking");
          }}
          className="absolute z-40 left-4 right-4 flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform"
          style={{
            top: "max(64px, calc(env(safe-area-inset-top, 0px) + 56px))",
            background: "hsl(226 24% 14% / 0.95)",
            border: "1px solid hsl(var(--accent) / 0.3)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 24px hsl(0 0% 0% / 0.3)",
          }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.15)" }}>
            <Navigation className="h-4.5 w-4.5" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold text-white">{activeJobs.length} active ride{activeJobs.length > 1 ? "s" : ""}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--accent) / 0.8)" }}>Tap to track your ride</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
            <span className="text-xs font-bold" style={{ color: "hsl(var(--accent))" }}>LIVE</span>
          </div>
        </motion.button>
      )}

      <TaxiBottomSheet snap={sheetSnap} onSnapChange={setSheetSnap}>
        <AnimatePresence mode="wait">
          {step === "search" && (
            <motion.div
              key="search-content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <TaxiSearchScreen />
            </motion.div>
          )}
          {step === "preview" && (
            <motion.div
              key="preview-content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <TaxiPreviewScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </TaxiBottomSheet>
    </SubPageShell>
  );
}
