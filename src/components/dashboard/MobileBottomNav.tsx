import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Home, MessageCircle, Store, FileText, Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface MobileBottomNavProps {
  onMenuOpen: () => void;
}

const MobileBottomNav = ({ onMenuOpen }: MobileBottomNavProps) => {
  const { pathname } = useLocation();
  const { t } = useI18n();

  const items = [
    { icon: LayoutDashboard, label: t("nav.dashboard") || "Dashboard", path: "/dashboard" },
    { icon: Home, label: t("nav.properties") || "Properties", path: "/dashboard/rental" },
    { icon: Store, label: t("nav.marketplace") || "Marketplace", path: "/dashboard/activities" },
    { icon: MessageCircle, label: t("nav.messages") || "Messages", path: "/dashboard/communication" },
    { icon: Menu, label: t("nav.more") || "More", path: "__menu__" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-card/98 backdrop-blur-lg safe-bottom" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-stretch justify-around h-14">
        {items.map((item) => {
          if (item.path === "__menu__") {
            return (
              <button
                key="menu"
                onClick={onMenuOpen}
                className="flex flex-col items-center justify-center flex-1 gap-0.5 text-muted-foreground active:bg-muted/50 transition-colors min-w-[44px] min-h-[44px]"
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            );
          }

          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors min-w-[44px] min-h-[44px] active:bg-muted/50 ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
              <span className={`text-[10px] font-medium leading-none ${active ? "text-accent" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
