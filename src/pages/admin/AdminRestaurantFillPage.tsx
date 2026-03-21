import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { runDubaiPizzaAutofill } from "@/lib/autofill/dubaiPizzaSeedRunner";
import { autoOnboardMerchant } from "@/lib/merchant/onboarding";

export default function AdminRestaurantFillPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [singleName, setSingleName] = useState("");
  const [singleArea, setSingleArea] = useState("Dubai Marina");
  const [results, setResults] = useState<any[]>([]);

  const createSingle = async () => {
    if (!singleName.trim()) {
      toast.error("Enter restaurant name");
      return;
    }

    try {
      setLoading(true);
      const res = await autoOnboardMerchant({
        name: singleName.trim(),
        category: "food",
        subcategory: "pizza",
        city: "Dubai",
        area: singleArea,
        items: [
          { name: "Margherita", description: "Tomato sauce, mozzarella, basil", price: 29, category: "pizza" },
          { name: "Pepperoni", description: "Tomato sauce, mozzarella, pepperoni", price: 34, category: "pizza" },
          { name: "Garlic Bread", description: "Fresh baked garlic bread", price: 14, category: "sides" },
        ],
      });
      setResults((prev) => [res, ...prev]);
      toast.success("Restaurant created");
      setSingleName("");
    } catch (e: any) {
      toast.error(e.message || "Single autofill failed");
    } finally {
      setLoading(false);
    }
  };

  const createBatch = async () => {
    try {
      setLoading(true);
      const res = await runDubaiPizzaAutofill(50);
      setResults(res);
      const ok = res.filter((r) => r.ok).length;
      toast.success(`${ok} restaurants created`);
    } catch (e: any) {
      toast.error(e.message || "Batch autofill failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold">Restaurant Autofill</h1>
          <p className="text-xs text-muted-foreground">Seed restaurants with menus</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold">Single Restaurant</div>
        <input
          value={singleName}
          onChange={(e) => setSingleName(e.target.value)}
          placeholder="Restaurant name"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <input
          value={singleArea}
          onChange={(e) => setSingleArea(e.target.value)}
          placeholder="Area"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <button onClick={createSingle} disabled={loading} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
          Create One Restaurant
        </button>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold">Dubai Batch Run</div>
        <div className="text-xs text-muted-foreground">
          Generate 50 pizza restaurants with menu items
        </div>
        <button onClick={createBatch} disabled={loading} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
          Run Batch Autofill
        </button>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-sm font-bold mb-2">Results</div>
        <pre className="text-[11px] text-muted-foreground overflow-auto max-h-60">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    </div>
  );
}
