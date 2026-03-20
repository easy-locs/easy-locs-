import { useNavigate } from "react-router-dom";

const ITEMS = [
  { id: "1", name: "Pepperoni Pizza", merchant: "Pizza Times Marina", price: 39 },
  { id: "2", name: "Garlic Bread", merchant: "Pizza Times Downtown", price: 14 },
  { id: "3", name: "Margherita Pizza", merchant: "Pizza Times JVC", price: 31 },
];

export default function CustomerFavoriteItemsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Favorite Items</h1>
          <p className="text-xs text-muted-foreground">Your most-loved dishes</p>
        </div>
      </div>

      <div className="space-y-3">
        {ITEMS.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.merchant}</div>
            <div className="text-sm font-bold mt-2">{row.price.toFixed(2)} AED</div>
          </div>
        ))}
      </div>
    </div>
  );
}
