/**
 * DriverLiveMissionsPage — Rider-only dispatch screen.
 * Route: /driver/live-missions
 * Actor: RIDER only. Go online, see offers, accept/reject, manage active trip.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";
import { RiderOfferCard } from "@/components/rides/RiderOfferCard";
import { DriverLiveTripCard } from "@/components/rides/DriverLiveTripCard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Power, Zap, Inbox } from "lucide-react";

export default function DriverLiveMissionsPage() {
  const navigate = useNavigate();
  const {
    presence, offers, activeJobId, loading,
    hydratePresence, toggleOnline, hydrateOffers,
  } = useRiderDispatchStore();

  useEffect(() => {
    hydratePresence();
    hydrateOffers();
  }, []);

  // Realtime: listen for new offers on mobility_job_offers
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`rider-offers:${user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "mobility_job_offers",
          filter: `rider_user_id=eq.${user.id}`,
        }, () => { hydrateOffers(); })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    const cleanup = setupRealtime();
    return () => { cleanup.then(fn => fn?.()); };
  }, []);

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Live Missions</h1>
          <p className="text-xs text-muted-foreground">
            {presence.isOnline ? "You're online — waiting for offers" : "Go online to receive offers"}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Online toggle */}
        <div className="rounded-2xl border border-border/20 bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Status</span>
          </div>
          <button
            onClick={toggleOnline}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-colors ${
              presence.isOnline
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                : "bg-muted text-muted-foreground border border-border/30"
            }`}
          >
            {presence.isOnline ? "🟢 Online" : "⚫ Offline"}
          </button>
        </div>

        {/* Active trip */}
        {activeJobId && <ActiveTripSection jobId={activeJobId} />}

        {/* Offers */}
        {!activeJobId && presence.isOnline && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-foreground">Available Offers</span>
              {offers.length > 0 && (
                <span className="text-[10px] bg-amber-500/10 text-amber-600 rounded-full px-2 py-0.5 font-bold">
                  {offers.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-32 bg-muted/40 rounded-xl animate-pulse" />)}
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No offers yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Stay online — new rides will appear here</p>
              </div>
            ) : (
              offers.map(o => <RiderOfferCard key={o.id} offer={o} />)
            )}
          </div>
        )}

        {/* Offline */}
        {!presence.isOnline && !activeJobId && (
          <div className="text-center py-12">
            <Power className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">You're offline</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Go online to start receiving ride offers</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveTripSection({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("mobility_jobs")
      .select("*")
      .eq("id", jobId)
      .single()
      .then(({ data }) => setJob(data));

    const ch = supabase
      .channel(`active-trip:${jobId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "mobility_jobs",
        filter: `id=eq.${jobId}`,
      }, (payload: any) => setJob(payload.new))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [jobId]);

  if (!job) return <div className="h-32 bg-muted/40 rounded-xl animate-pulse" />;
  return <DriverLiveTripCard jobId={jobId} job={job} />;
}
