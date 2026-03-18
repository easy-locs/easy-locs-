/**
 * RideSearchStatus — Status card for ride search and lifecycle states.
 */

export default function RideSearchStatus({
  status,
  currentWave = 0,
  nearbyCount = 0,
  etaMin,
}: {
  status: "idle" | "searching" | "assigned" | "expired" | "error" | "driver_arrived" | "in_progress" | "completed" | string;
  currentWave?: number;
  nearbyCount?: number;
  etaMin?: number | null;
}) {
  if (status === "assigned") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="font-semibold text-foreground">Driver found</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {etaMin != null ? `Arriving in about ${etaMin} min` : "Your ride is confirmed"}
        </div>
      </div>
    );
  }

  if (status === "driver_arrived") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="font-semibold text-foreground">Driver arrived</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Your driver is waiting at pickup
        </div>
      </div>
    );
  }

  if (status === "in_progress") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="font-semibold text-foreground">Trip in progress</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Live route and ride tracking active
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="font-semibold text-foreground">Ride completed</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Receipt and rating are ready
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="font-semibold text-foreground">No driver accepted</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Try again in a few seconds
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="font-semibold text-foreground">Finding the fastest driver</div>
      <div className="mt-1 text-sm text-muted-foreground">
        Searching nearby drivers: {nearbyCount} available · wave {currentWave + 1}
      </div>
    </div>
  );
}
