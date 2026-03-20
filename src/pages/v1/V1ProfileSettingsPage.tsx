import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function V1ProfileSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const actions = [
    { key: "notifications", label: "Notifications", path: "/notifications" },
    { key: "wallet", label: "Wallet", path: "/wallet/hub" },
    { key: "orders", label: "My Orders", path: "/my-orders" },
    { key: "favorites", label: "Favorites", path: "/favorites" },
    { key: "addresses", label: "Addresses", path: "/settings/addresses" },
    { key: "support", label: "Support", path: "/support/tickets" },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-5">
      <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
        <div className="text-sm font-bold">{user?.email || "Profile"}</div>
        <div className="text-xs text-muted-foreground mt-1">Settings / Profile</div>
      </div>

      <div className="space-y-3">
        {actions.map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className="w-full rounded-[24px] border border-border/20 bg-card px-4 py-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="text-sm font-bold">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
