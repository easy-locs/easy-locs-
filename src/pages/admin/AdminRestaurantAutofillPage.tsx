import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type DraftStore = { name: string; area: string; subcategory: string };

export default function AdminRestaurantAutofillPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DraftStore[]>([
    { name: "Pizza Times Marina", area: "Dubai Marina", subcategory: "pizza" },
    { name: "Pizza Times Downtown", area: "Downtown Dubai", subcategory: "pizza" },
  ]);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [subcategory, setSubcategory] = useState("pizza");

  const addDraft = () => {
    if (!name.trim()) return;
    setRows((prev) => [...prev, { name: name.trim(), area: area.trim(), subcategory }]);
    setName("");
    setArea("");
    setSubcategory("pizza");
    toast.success("Draft store added");
  };

  const runAutofill = () => {
    toast.success("Restaurant autofill launched");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Restaurant Autofill</h1>
          <p className="text-xs text-muted-foreground">Seed draft restaurants</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold">Add Draft Restaurant</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Restaurant name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm">
          <option value="pizza">Pizza</option>
          <option value="burger">Burger</option>
          <option value="chicken">Chicken</option>
          <option value="shawarma">Shawarma</option>
        </select>
        <div className="flex gap-3">
          <button onClick={addDraft} className="flex-1 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">Add Draft</button>
          <button onClick={runAutofill} className="flex-1 rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Run Autofill</button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.subcategory} · {row.area || "Dubai"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
