import { Link, useLocation } from "react-router-dom";
import { useLiveBadges } from "@/hooks/useLiveBadges";
import { useLiveBadgeStore } from "@/stores/liveBadgeStore";

const links = [
  { to: "/v2-home", label: "Home" },
  { to: "/v2-mega", label: "Mega" },
  { to: "/v2-owner", label: "Owner", badgeKey: "pendingBookingCount" as const },
  { to: "/v2-tenant", label: "Tenant" },
  { to: "/v2-bookings", label: "Bookings", badgeKey: "pendingBookingCount" as const },
  { to: "/v2-properties", label: "Properties" },
  { to: "/v2-favorites", label: "Favorites" },
  { to: "/v2-search", label: "Search" },
  { to: "/v2-map", label: "Map" },
  { to: "/v2-messages", label: "Messages" },
  { to: "/v2-notifications", label: "Notifications", badgeKey: "notificationCount" as const },
  { to: "/v2-payments", label: "Payments" },
];

export function AppMainNav() {
  const location = useLocation();
  useLiveBadges();

  const notificationCount = useLiveBadgeStore((s) => s.notificationCount);
  const pendingBookingCount = useLiveBadgeStore((s) => s.pendingBookingCount);

  const getBadge = (key?: string) => {
    if (key === "notificationCount") return notificationCount;
    if (key === "pendingBookingCount") return pendingBookingCount;
    return 0;
  };

  return (
    <nav className="flex flex-wrap gap-2 p-2 border-b border-border bg-muted/50">
      {links.map((link) => {
        const active = location.pathname === link.to;
        const badge = getBadge(link.badgeKey);

        return (
          <Link
            key={link.to}
            to={link.to}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {link.label}
            {badge > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
