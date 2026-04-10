import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { autoOnboardMerchant } from "@/lib/merchant/onboarding";
import { toast } from "sonner";

const DEFAULT_ITEMS = [
  { name: "Margherita", description: "Tomato, mozzarella, basil", price: 29 },
  { name: "Pepperoni", description: "Pepperoni, mozzarella", price: 35 },
  { name: "Garlic Bread", description: "Freshly baked", price: 14 },
  { name: "Coke", description: "33cl", price: 6 },
];

export default function AdminMerchantAutofillPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [subcategory, setSubcategory] = useState("pizza");
  const [loading, setLoading] = useState(false);

  const runAutoOnboard = async () => {
    if (!name.trim()) {
      toast.error("Enter a merchant name");
      return;
    }

    try {
      setLoading(true);
      const merchant = await autoOnboardMerchant({
        name,
        category: "food",
        subcategory,
        city: "Dubai",
        area: "Business Bay",
        items: DEFAULT_ITEMS,
      });
      toast.success(`Merchant ready: ${(merchant as any).name}`);
      navigate("/admin/ops-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Auto-onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold">Merchant Auto-Onboarding</h1>
          <p className="text-xs text-muted-foreground">Create store + products + ready status</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold mb-1">Store name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
            placeholder="Example Pizza Times Marina"
          />
        </div>

        <div>
          <p className="text-sm font-semibold mb-1">Subcategory</p>
          <input
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
          />
        </div>

        <button
          onClick={runAutoOnboard}
          disabled={loading}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Merchant Automatically"}
        </button>
      </div>
    </div>
  );
}
