import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SECTION_PREFIXES: [string, string][] = [
  ["/dashboard", "Dashboard"],
  ["/real-estate", "RealEstate"],
  ["/my-orders", "Orders"],
  ["/merchant", "Merchant"],
  ["/mobility", "Mobility"],
  ["/checkout", "Checkout"],
  ["/settings", "Settings"],
  ["/property", "Property"],
  ["/driver", "Driver"],
  ["/seller", "Seller"],
  ["/travel", "Travel"],
  ["/browse", "Browse"],
  ["/radar", "Radar"],
  ["/orbit", "Orbit"],
  ["/wallet", "Wallet"],
  ["/admin", "Admin"],
  ["/food", "Food"],
  ["/shop", "Shop"],
  ["/me/", "Me"],
  ["/me", "Me"],
];

function resolveSection(pathname: string): string {
  for (const [prefix, section] of SECTION_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || (prefix.endsWith("/") && pathname.startsWith(prefix))) {
      return section;
    }
  }
  if (pathname === "/" || pathname === "/home") return "Home";
  return "Other";
}

export default function SentryRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    const section = resolveSection(location.pathname);
    void import("@/lib/analytics/sentry").then((m) => {
      m.setSectionContext(section, location.pathname);
    }).catch(() => {});
  }, [location.pathname]);

  return null;
}
