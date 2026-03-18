import { createDispatchPrediction, pingDispatchCandidates } from "@/lib/dispatch/predictive-dispatch";

export default function PredictiveDispatchPage() {
  const simulate = async () => {
    const job = await createDispatchPrediction({
      contextType: "order",
      contextId: crypto.randomUUID(),
      predictedEtaMinutes: 17,
      predictedFee: 12,
      confidence: 0.88,
      candidateDrivers: [
        { driverId: crypto.randomUUID(), distanceKm: 1.1, etaMinutes: 4, score: 98 },
        { driverId: crypto.randomUUID(), distanceKm: 1.8, etaMinutes: 6, score: 92 },
        { driverId: crypto.randomUUID(), distanceKm: 2.4, etaMinutes: 8, score: 84 },
      ],
      metadata: { source: "predictive-precheckout" },
    });
    await pingDispatchCandidates(job.id);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Predictive Dispatch</h1>
        <p className="text-sm text-muted-foreground">Create driver predictions before buyer finishes checkout</p>
      </div>
      <button onClick={simulate} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Simulate predictive dispatch
      </button>
    </div>
  );
}
