import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CustomerWeeklyMealPlanPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Record<string, string>>({
    Mon: "Pizza", Tue: "Pasta", Wed: "Chicken", Thu: "Burger", Fri: "Pizza", Sat: "Family Meal", Sun: "Light Dinner",
  });

  const update = (day: string, value: string) => {
    setPlan((prev) => ({ ...prev, [day]: value }));
  };

  const save = () => {
    toast.success("Weekly meal plan saved");
    navigate("/me");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Weekly Meal Plan" subtitle="Organize meals through the week" onBack={() => navigate("/me")} />
      <div className="space-y-3">
        {DAYS.map((day) => (
          <div key={day} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold mb-3">{day}</div>
            <input value={plan[day] || ""} onChange={(e) => update(day, e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Meal idea" />
          </div>
        ))}
      </div>
      <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Weekly Plan</button>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
