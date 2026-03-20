import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function CustomerLiveTrackingPage() {
  const navigate = useNavigate();
  const { orderId = "" } = useParams();
  const [status, setStatus] = useState("preparing");

  useEffect(() => {
    const steps = ["preparing", "picked_up", "on_the_way", "arriving"];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i >= steps.length) return clearInterval(interval);
      setStatus(steps[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/my-orders")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Live Tracking</h1>
          <p className="text-xs text-muted-foreground">Order {orderId.slice(0, 8)}</p>
        </div>
      </div>

      <div className="mx-4 rounded-2xl border border-border/20 bg-card p-6 text-center mb-4">
        <div className="text-sm font-bold text-foreground capitalize">{status.replaceAll("_", " ")}</div>
        <div className="text-xs text-muted-foreground mt-2">Driver is moving in real time (simulated)</div>
      </div>

      <div className="px-4 space-y-2">
        {["Order Confirmed", "Preparing", "Picked Up", "On The Way", "Arriving"].map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs text-foreground">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
