import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/v2-mega", label: "Mega" },
  { to: "/v2-owner", label: "Owner" },
  { to: "/v2-tenant", label: "Tenant" },
  { to: "/v2-bookings", label: "Bookings" },
  { to: "/v2-properties", label: "Properties" },
  { to: "/v2-search", label: "Search" },
  { to: "/v2-map", label: "Map" },
  { to: "/v2-messages", label: "Messages" },
  { to: "/v2-notifications", label: "Notifications" },
  { to: "/v2-payments", label: "Payments" },
];

export function AppMainNav() {
  const location = useLocation();

  return (
    <nav className="flex flex-wrap gap-2 p-2 border-b border-border bg-muted/50">
      {links.map((link) => {
        const active = location.pathname === link.to;
        return (
          <Link
            key={link.to}
            to={link.to}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
