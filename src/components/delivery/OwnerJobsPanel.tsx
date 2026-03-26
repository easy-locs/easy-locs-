import { useMemo } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";

export function OwnerJobsPanel() {
  const jobs = useDeliveryStore((s) => s.jobs);

  const myJobs = useMemo(() => {
    return jobs.filter((x) => x.seller_id);
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
            Driver: {job.driver_id?.toString().slice(0, 12) ?? "searching…"}
          </p>
          <p className="text-xs text-muted-foreground">
            Fee: {job.delivery_fee ?? 0}
          </p>
        </div>
      ))}
    </div>
  );
}
