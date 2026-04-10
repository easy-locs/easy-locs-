import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { assignMatchedDriver } from "@/lib/core/driverMatchingEngine";
import { moveOrderToNextState } from "@/lib/core/realtimeOrderStateEngine";

export default function AdminCoreEnginePage() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runDriverMatch = async () => {
    if (!orderId.trim()) {
      toast.error("Enter order ID");
      return;
    }
    try {
      setLoading(true);
      const res = await assignMatchedDriver({ orderId: orderId.trim() });
      setResult(res);
      toast.success(res ? "Driver matched" : "No driver found");
    } catch (e: any) {
      toast.error("Matching failed");
    } finally {
      setLoading(false);
    }
  };

  const runNextState = async () => {
    if (!orderId.trim()) {
      toast.error("Enter order ID");
      return;
    }
    try {
      setLoading(true);
      const res = await moveOrderToNextState(orderId.trim());
      setResult(res);
      toast.success("Order advanced");
    } catch (e: any) {
      toast.error("State move failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Core Engine</h1>
          <p className="text-xs text-muted-foreground">Driver matching & order state</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <p className="text-sm font-bold text-foreground">Order ID</p>
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Enter order id"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3"
        />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={runDriverMatch}
            disabled={loading}
            className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
          >
            Match Driver
          </button>
          <button
            onClick={runNextState}
            disabled={loading}
            className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground disabled:opacity-50"
          >
            Next State
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <p className="text-sm font-bold text-foreground">Result</p>
          <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
