import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerKidsMealProfilePage() {
  const navigate = useNavigate();
  const [allergy, setAllergy] = useState("");
  const [favoriteMeal, setFavoriteMeal] = useState("Mini Margherita");
  const [drink, setDrink] = useState("Apple Juice");
  const [notes, setNotes] = useState("");

  const save = () => {
    toast.success("Kids meal profile saved");
    navigate("/me");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Kids Meal Profile" subtitle="Store child-specific meal preferences" onBack={() => navigate("/me")} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={allergy} onChange={(e) => setAllergy(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Allergy notes" />
        <input value={favoriteMeal} onChange={(e) => setFavoriteMeal(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Favorite meal" />
        <input value={drink} onChange={(e) => setDrink(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Preferred drink" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none" rows={4} placeholder="Extra notes" />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Kids Profile</button>
      </div>
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
