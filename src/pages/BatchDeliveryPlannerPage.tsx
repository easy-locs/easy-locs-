import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { optimizeRoute } from "@/lib/dispatch/route-optimizer";
import { Button } from "@/components/ui/button";

export default function BatchDeliveryPlannerPage() {
  const [route, setRoute] = useState<{ lat: number; lng: number }[]>([]);

  const simulate = () => {
    const points = [
      { lat: 25.2048, lng: 55.2708 },
      { lat: 25.2101, lng: 55.275 },
      { lat: 25.198, lng: 55.28 },
      { lat: 25.215, lng: 55.265 },
    ];
    setRoute(optimizeRoute(points));
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Batch Delivery Planner</h1>
        <p className="text-sm text-muted-foreground">Optimize multi-order stop sequence</p>
      </div>
      <Button onClick={simulate} className="w-full rounded-xl">Optimize route</Button>
      <div className="space-y-2">
        {route.map((point, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-3">
            <p className="text-sm text-foreground">Stop {idx + 1}: {point.lat.toFixed(4)}, {point.lng.toFixed(4)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
