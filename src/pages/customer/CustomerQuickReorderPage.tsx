import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MOCK = [
  { id: "1", name: "Pepperoni Pizza", price: 35 },
  { id: "2", name: "Margherita Pizza", price: 28 },
];

export default function CustomerQuickReorderPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Quick Reorder</h1>
          <p className="text-xs text-muted-foreground">Reorder your favorites</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {MOCK.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{item.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{item.price} AED</div>
            <button onClick={() => toast.success("Added to cart")} className="mt-2 w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold">
              Reorder
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
