import { useNavigate } from "react-router-dom";

const FEATURED_ROWS = [
  { item: "Pepperoni Pizza", featured: true },
  { item: "Margherita Pizza", featured: true },
  { item: "Garlic Bread", featured: false },
  { item: "Family Combo", featured: true },
];

export default function MerchantFeaturedItemsPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Featured Items" subtitle="Highlight selected menu products" onBack={() => navigate(-1)} />
      <div className="space-y-3">
        {FEATURED_ROWS.map((row) => (
          <div key={row.item} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{row.item}</div>
            <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.featured ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}>
              {row.featured ? "Featured" : "Normal"}
            </div>
          </div>
        ))}
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
