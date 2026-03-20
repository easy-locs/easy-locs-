import { useNavigate } from "react-router-dom";

const HELP_ROWS = [
  { title: "Order issue", desc: "Delivery late, missing item, wrong status", path: "/support/tickets" },
  { title: "Wallet issue", desc: "Payment, top-up, refund, missing balance", path: "/wallet/hub" },
  { title: "Notification issue", desc: "Too many alerts or not receiving updates", path: "/settings/notification-preferences" },
  { title: "General support", desc: "Open help area and create a ticket", path: "/settings/support" },
];

export default function CustomerQuickHelpPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Quick Help</h1>
          <p className="text-xs text-muted-foreground">Fast shortcuts for common problems</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {HELP_ROWS.map((row) => (
          <button
            key={row.title}
            onClick={() => navigate(row.path)}
            className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform"
          >
            <p className="text-sm font-bold text-foreground">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
