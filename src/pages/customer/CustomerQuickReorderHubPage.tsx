import { useNavigate } from "react-router-dom";

const REORDER_ROWS = [
  { id: "o1", label: "Pepperoni + Garlic Bread", merchant: "Pizza Times Marina", total: 53 },
  { id: "o2", label: "Margherita x2", merchant: "Pizza Times Downtown", total: 62 },
  { id: "o3", label: "Family Meal", merchant: "Pizza Times JVC", total: 89 },
];

export default function CustomerQuickReorderHubPage() {
  const navigate = useNavigate();

  const reorder = (id: string) => {
    navigate(`/order/reorder/${id}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Quick Reorder</h1>
          <p className="text-xs text-muted-foreground">Repeat your favorites fast</p>
        </div>
      </div>

      <div className="space-y-3">
        {REORDER_ROWS.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.merchant}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.total.toFixed(2)} AED</div>
            <button onClick={() => reorder(row.id)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full mt-4">
              Reorder
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
