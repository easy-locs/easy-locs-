import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { autoOnboardMerchant } from "@/lib/merchant/onboarding";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_ITEMS = [
  { name: "Margherita", description: "Tomato, mozzarella, basil", price: 29 },
  { name: "Pepperoni", description: "Pepperoni, mozzarella", price: 35 },
  { name: "Garlic Bread", description: "Freshly baked", price: 14 },
  { name: "Coke", description: "33cl", price: 6 },
];

export default function AdminSeedToolsPage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);

  const createSample = async (name: string, area: string) => {
    await autoOnboardMerchant({
      name,
      category: "food",
      subcategory: "pizza",
      city: "Dubai",
      area,
      items: SAMPLE_ITEMS,
    });
  };

  const runQuickSeed = async () => {
    try {
      setRunning(true);
      await createSample("Pizza Times Downtown", "Downtown Dubai");
      await createSample("Pizza Times JVC", "JVC");
      await createSample("Pizza Times Marina", "Dubai Marina");
      toast.success("Quick seed completed");
    } catch (err: any) {
      toast.error(err.message || "Quick seed failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background px-4 pb-24">
      <header className="flex items-center gap-3 pt-4 pb-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Seed Tools</h1>
          <p className="text-xs text-muted-foreground">Quick platform setup actions</p>
        </div>
      </header>

      <div className="space-y-3 mt-2">
        <button
          onClick={runQuickSeed}
          disabled={running}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {running ? "Running..." : "Create 3 Sample Pizza Stores"}
        </button>

        <button
          onClick={() => navigate("/admin/bulk-merchant-import")}
          className="w-full rounded-2xl bg-card border border-border/20 px-4 py-3 text-sm font-bold text-left text-foreground active:scale-[0.98] transition-transform"
        >
          Open Bulk Merchant Import
        </button>

        <button
          onClick={() => navigate("/admin/merchant-autofill")}
          className="w-full rounded-2xl bg-card border border-border/20 px-4 py-3 text-sm font-bold text-left text-foreground active:scale-[0.98] transition-transform"
        >
          Open Merchant Autofill
        </button>
      </div>
    </div>
  );
}
