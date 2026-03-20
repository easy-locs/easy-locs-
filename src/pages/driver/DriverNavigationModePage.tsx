import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function DriverNavigationModePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"map" | "list" | "compass">("map");

  const save = () => {
    toast.success(`Navigation mode set to ${mode}`);
    navigate("/driver/dashboard");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Navigation Mode</h1>
          <p className="text-xs text-muted-foreground">Choose how you navigate</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["map", "list", "compass"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-2xl px-4 py-4 text-sm font-bold capitalize ${
              mode === m ? "bg-primary text-primary-foreground" : "bg-card border border-border/20 text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
        Save Mode
      </button>
    </div>
  );
}
