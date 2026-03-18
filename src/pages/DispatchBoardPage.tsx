import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { acceptDispatchBid, createDispatchJob, submitDispatchBid } from "@/lib/dispatch/dispatch-v1";

export default function DispatchBoardPage() {
  const [job, setJob] = useState<any>(null);
  const [bid, setBid] = useState<any>(null);

  const createJob = async () => {
    const newJob = await createDispatchJob({
      pickupLabel: "Pizza Times Marina",
      dropoffLabel: "JLT Cluster A",
      quotedFee: 14,
      currency: "AED",
    });
    setJob(newJob);
  };

  const placeBid = async () => {
    if (!job) return;
    const newBid = await submitDispatchBid({
      jobId: job.id,
      driverId: crypto.randomUUID(),
      bidType: "accept_quote",
      amount: 14,
      etaMinutes: 17,
    });
    setBid(newBid);
  };

  const accept = async () => {
    if (!bid) return;
    const updatedJob = await acceptDispatchBid({ bidId: bid.id });
    setJob(updatedJob);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Dispatch Board V1</h1>
        <p className="text-sm text-muted-foreground">Open job → bid → accept → assign</p>
      </div>

      <div className="flex gap-2">
        <button onClick={createJob} className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold">Create job</button>
        <button onClick={placeBid} disabled={!job} className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-xl text-sm font-semibold disabled:opacity-50">Submit bid</button>
        <button onClick={accept} disabled={!bid} className="flex-1 bg-accent text-accent-foreground py-2 rounded-xl text-sm font-semibold disabled:opacity-50">Accept bid</button>
      </div>

      {!!job && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-sm font-medium text-foreground">job: {job.id}</p>
          <p className="text-xs text-muted-foreground">status: {job.status}</p>
          <p className="text-xs text-muted-foreground">fee: {job.final_fee ?? job.quoted_fee} {job.currency}</p>
        </div>
      )}
    </div>
  );
}
