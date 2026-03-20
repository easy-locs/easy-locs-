import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type MealSlot = {
  id: string;
  day: string;
  meal: string;
  item: string;
};

export default function CustomerMealPlannerPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MealSlot[]>([
    { id: "1", day: "Monday", meal: "Lunch", item: "Pepperoni Pizza" },
    { id: "2", day: "Friday", meal: "Dinner", item: "BBQ Chicken Pizza" },
  ]);

  const addPlan = () => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), day: "Sunday", meal: "Dinner", item: "Margherita Pizza" },
    ]);
    toast.success("Meal added");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Meal Planner</h1>
          <p className="text-xs text-muted-foreground">Plan your weekly meals</p>
        </div>
      </div>

      <button onClick={addPlan} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
        Add Meal Plan
      </button>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-xs text-muted-foreground">{row.day} · {row.meal}</div>
            <div className="text-sm font-bold text-foreground mt-1">{row.item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
