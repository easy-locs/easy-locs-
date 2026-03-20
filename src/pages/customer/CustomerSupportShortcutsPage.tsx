import { useNavigate } from "react-router-dom";

const SHORTCUTS = [
  { label: "My Tickets", path: "/support/tickets", desc: "See all support requests" },
  { label: "Refund Request", path: "/my-orders", desc: "Open an order then request refund" },
  { label: "Wallet Help", path: "/wallet/hub", desc: "Check wallet and payment activity" },
  { label: "Notification Settings", path: "/settings/notification-preferences", desc: "Control your alerts" },
];

export default function CustomerSupportShortcutsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/settings/support")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Support Shortcuts</h1>
          <p className="text-xs text-muted-foreground">Fast access to help flows</p>
        </div>
      </div>
      <div className="px-4 space-y-3">
        {SHORTCUTS.map((row) => (
          <button key={row.label} onClick={() => navigate(row.path)} className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform">
            <p className="text-sm font-bold text-foreground">{row.label}</p>
            <p className="text-xs text-muted-foreground">{row.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
