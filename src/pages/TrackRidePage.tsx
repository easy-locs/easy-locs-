/**
 * TrackRidePage — /mobility/track/:jobId — Live job tracking via canonical mobility_jobs.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import DriverMap from "@/components/radar/DriverMap";
import { supabase } from "@/integrations/supabase/client";

export default function TrackRidePage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    if (!jobId) return;
    (supabase as any)
      .from("mobility_jobs")
      .select("*")
      .eq("id", jobId)
      .single()
      .then(({ data }: any) => setJob(data ?? null));
  }, [jobId]);

  // Realtime updates
  useEffect(() => {
    if (!jobId) return;
    const ch = supabase
      .channel(`track-job-${jobId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mobility_jobs", filter: `id=eq.${jobId}` }, (payload: any) => {
        setJob(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId]);

  const status = job?.status ?? "loading";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <BackCard />
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-foreground">Track your ride</h1>
          <p className="text-xs text-muted-foreground">Live tracking · {status}</p>
        </div>

        <div className="h-52 rounded-2xl overflow-hidden border border-border">
          <DriverMap
            driverId={job?.rider_user_id ?? undefined}
            pickupLat={job?.pickup_lat}
            pickupLng={job?.pickup_lng}
            dropoffLat={job?.dropoff_lat}
            dropoffLng={job?.dropoff_lng}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Status</p>
            <p className="text-sm font-semibold text-foreground capitalize">{status.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Type</p>
            <p className="text-sm font-semibold text-foreground capitalize">{job?.job_type?.replace(/_/g, ' ') ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Price</p>
            <p className="text-sm font-semibold text-foreground">
              {job?.current_price != null ? `${job.current_price} ${job.currency}` : '—'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {jobId && (
            <button
              onClick={() => navigate(`/mobility/receipt/${jobId}`)}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
            >
              🧾 Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
