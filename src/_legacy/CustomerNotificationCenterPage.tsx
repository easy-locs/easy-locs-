import { useNavigate } from "react-router-dom";

const MOCK_NOTIFICATIONS = [
  { id: "1", title: "Order confirmed", body: "Your latest order has been confirmed.", createdAt: new Date().toISOString() },
  { id: "2", title: "Promo available", body: "A new offer is live near you.", createdAt: new Date().toISOString() },
];

export default function CustomerNotificationCenterPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Notification Center</h1>
          <p className="text-xs text-muted-foreground">Your recent platform alerts</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {MOCK_NOTIFICATIONS.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <p className="text-sm font-bold text-foreground">{row.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{row.body}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">{new Date(row.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
