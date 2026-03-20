import { useNavigate } from "react-router-dom";

export default function DriverAcceptanceRatePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Acceptance Rate</h1>
          <p className="text-xs text-muted-foreground">Your mission acceptance stats</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/20 bg-card p-6 text-center">
        <div className="text-xs text-muted-foreground">Current Rate</div>
        <div className="text-3xl font-bold mt-2">91%</div>
        <div className="text-xs text-muted-foreground mt-3">Keep your acceptance rate high to receive more missions</div>
      </div>
    </div>
  );
}
