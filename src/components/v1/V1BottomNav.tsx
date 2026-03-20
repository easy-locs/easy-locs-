import { useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, Store, Car, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { key: "home", label: "Home", path: "/home", icon: Home },
  { key: "orbit", label: "Orbit", path: "/orbit", icon: MessageCircle },
  { key: "achille", label: "Achille", path: "/achille", icon: Store },
  { key: "ride", label: "Ride", path: "/ride", icon: Car },
  { key: "wallet", label: "Wallet", path: "/wallet/hub", icon: Wallet },
];

export default function V1BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/20 bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 active:scale-95 transition-transform"
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon size={18} />
              </div>
              <span className={`text-[10px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
