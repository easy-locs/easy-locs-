import { useNavigate } from "react-router-dom";

const PROMOS = [
  { id: "1", title: "WELCOME10", desc: "10% off your next order" },
  { id: "2", title: "PIZZA25", desc: "25 off above 80" },
];

export default function CustomerPromoWalletPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Promo Wallet</h1>
          <p className="text-xs text-muted-foreground">Your saved offers</p>
        </div>
      </div>
      <div className="space-y-3">
        {PROMOS.map((promo) => (
          <div key={promo.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{promo.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{promo.desc}</div>
            <div className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">Active</div>
          </div>
        ))}
      </div>
    </div>
  );
}
