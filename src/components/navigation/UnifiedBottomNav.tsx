/**
 * UnifiedBottomNav — Legacy compat wrapper.
 * Dashboard | Radar | Orbit | Wallet | Me
 */
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Radar, MessageCircle, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "home", label: "Home", icon: Home, path: "/" },
  { key: "radar", label: "Radar", icon: Radar, path: "/radar" },
  { key: "orbit", label: "Orbit", icon: MessageCircle, path: "/dashboard/communication" },
  { key: "wallet", label: "Wallet", icon: Wallet, path: "/wallet/hub" },
  { key: "profile", label: "Me", icon: User, path: "/settings" },
] as const;

function isActive(path: string, currentPath: string) {
  if (path === "/") return currentPath === "/" || currentPath === "/index";
  return currentPath.startsWith(path);
}

export default function UnifiedBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40",
        "bg-card/95 backdrop-blur-lg border-t border-border/30",
        "pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      <div className="flex items-stretch h-14 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const active = isActive(tab.path, pathname);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5",
                "active:scale-[0.92] transition-all duration-100",
                "min-h-[var(--touch-min)]",
              )}
            >
              <tab.icon
                className={cn(
                  "w-5 h-5 transition-colors duration-150",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold leading-tight transition-colors duration-150",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
