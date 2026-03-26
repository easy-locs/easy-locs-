/**
 * PayRidePage — Payment page for a ride via thread context.
 */
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";

export default function PayRidePage() {
  const { threadId } = useParams();

  return (
    <div className="app-mobile-page bg-background">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <BackCard />
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-foreground">Pay for Ride</h1>
          <p className="text-xs text-muted-foreground">
            Thread: {threadId ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Payment interface coming soon
        </div>
      </div>
    </div>
  );
}
