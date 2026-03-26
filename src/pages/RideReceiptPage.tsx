/**
 * RideReceiptPage — /mobility/receipt/:jobId — Receipt from canonical mobility_jobs.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";
import { formatMoneyByCountry } from "@/lib/currency-engine";

export default function RideReceiptPage() {
  const { jobId } = useParams();
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

  return (
    <div className="app-mobile-page bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <BackCard />
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h1 className="text-lg font-bold text-foreground">Receipt</h1>
          <p className="text-xs text-muted-foreground capitalize">
            {job?.job_type?.replace(/_/g, ' ') ?? 'Ride'} · {jobId?.slice(0, 8)}
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-foreground capitalize">{job?.status?.replace(/_/g, ' ') ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-foreground">
                {job?.current_price != null ? formatMoneyByCountry(job.current_price, job?.country_code, job?.currency) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pickup</span>
              <span className="font-medium text-foreground truncate max-w-[60%] text-right">{job?.pickup_address ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dropoff</span>
              <span className="font-medium text-foreground truncate max-w-[60%] text-right">{job?.dropoff_address ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium text-foreground">{job?.completed_at ? new Date(job.completed_at).toLocaleString() : "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
