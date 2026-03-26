import { useMemo, useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";

export function OwnerJobsPanel() {
  const jobs = useCustomerMobilityStore((s) => s.jobs);
  const hydrateMyJobs = useCustomerMobilityStore((s) => s.hydrateMyJobs);

  useEffect(() => { hydrateMyJobs(); }, []);

  const myJobs = useMemo(() => {
    return jobs.filter((x) => ["parcel_delivery", "food_delivery"].includes(x.job_type));
  }, [jobs]);

  if (myJobs.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">My Deliveries</h3>
        <p className="text-xs text-muted-foreground">No delivery jobs</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">My Deliveries</h3>
      {myJobs.map((job) => (
        <div key={job.id} className="p-3 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">{job.id.slice(0, 16)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {job.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Rider: {job.rider_user_id?.slice(0, 12) ?? "searching…"}
          </p>
          <p className="text-xs text-muted-foreground">
            Fare: {job.current_price ?? job.quoted_price ?? 0} {job.currency}
          </p>
        </div>
      ))}
    </div>
  );
}
