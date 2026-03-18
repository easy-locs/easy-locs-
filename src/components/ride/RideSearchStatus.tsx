/**
 * RideSearchStatus — Simple status card for ride search state.
 */

export default function RideSearchStatus({
  status,
  currentWave,
  nearbyCount,
}: {
  status: string;
  currentWave: number;
  nearbyCount: number;
}) {
  if (status === "assigned") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm text-green-500 font-semibold">Driver found</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Your ride is confirmed
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold">No driver accepted</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Try again in a few seconds
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-semibold">Finding the fastest driver</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Searching nearby drivers: {nearbyCount} available · wave {currentWave + 1}
      </div>
    </div>
  );
}
