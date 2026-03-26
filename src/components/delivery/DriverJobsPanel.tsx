import { useMemo } from "react";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";
import { Check, X, Package, Truck, MapPin } from "lucide-react";

export function DriverJobsPanel() {
  const jobs = useDeliveryStore((s) => s.jobs);
  const acceptJob = useDeliveryStore((s) => s.acceptJob);
  const rejectJob = useDeliveryStore((s) => s.rejectJob);
  const updateJobStatus = useDeliveryStore((s) => s.updateJobStatus);

  const driverJobs = useMemo(() => {
    return jobs.filter((x) => x.driver_id && ["assigned", "accepted", "picked_up", "on_the_way"].includes(x.status));
  }, [jobs]);

  if (driverJobs.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">Driver Jobs</h3>
        <p className="text-xs text-muted-foreground">No assigned jobs</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Driver Jobs</h3>

      {driverJobs.map((job) => (
        <div key={job.id} className="p-3 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">{job.id.slice(0, 16)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {job.status}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Fee: {job.delivery_fee ?? 0} • Priority: {(job as any).priority ?? "normal"}
          </p>

          {job.status === "assigned" && (
            <div className="flex gap-2">
              <button
                onClick={() => void acceptJob(job.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors active:scale-[0.97]"
              >
                <Check className="w-3.5 h-3.5" /> Accept
              </button>
              <button
                onClick={() => void rejectJob(job.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors active:scale-[0.97]"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          )}

          {job.status === "accepted" && (
            <button
              onClick={() => void updateJobStatus(job.id, "picked_up")}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors active:scale-[0.97]"
            >
              <Package className="w-3.5 h-3.5" /> Mark Picked Up
            </button>
          )}

          {job.status === "picked_up" && (
            <button
              onClick={() => void updateJobStatus(job.id, "on_the_way")}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors active:scale-[0.97]"
            >
              <Truck className="w-3.5 h-3.5" /> On The Way
            </button>
          )}

          {job.status === "on_the_way" && (
            <button
              onClick={() => void updateJobStatus(job.id, "delivered")}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors active:scale-[0.97]"
            >
              <MapPin className="w-3.5 h-3.5" /> Mark Delivered
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
