import { useNavigate } from "react-router-dom";

const BADGES = [
  { item: "Pepperoni Pizza", badge: "Best Seller" },
  { item: "Margherita Pizza", badge: "Classic" },
  { item: "Garlic Bread", badge: "Popular Add-on" },
  { item: "Chicken Pizza", badge: "New" },
];

export default function MerchantItemBadgesPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Item Badges" subtitle="Highlight menu items visually" onBack={() => navigate(-1)} />
      <div className="space-y-3">
        {BADGES.map((row) => (
          <div key={row.item} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{row.item}</div>
            <div className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-bold">{row.badge}</div>
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
