import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const FAVORITES = [
  { id: "1", name: "Pepperoni Large", price: 45 },
  { id: "2", name: "BBQ Chicken", price: 40 },
];

export default function CustomerFavoriteOrdersPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Favorite Orders</h1>
          <p className="text-xs text-muted-foreground">Reorder quickly</p>
        </div>
      </div>
      <div className="space-y-3">
        {FAVORITES.map((f) => (
          <div key={f.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{f.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{f.price} AED</div>
            <button onClick={() => toast.success("Reordered")} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold mt-2">Reorder</button>
          </div>
        ))}
      </div>
    </div>
  );
}
