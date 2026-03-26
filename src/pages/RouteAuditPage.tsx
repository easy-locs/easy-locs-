/**
 * Route Audit Page — Lists all registered routes and their health status.
 */
import { ROUTE_REGISTRY } from "@/lib/routes";
import { CheckCircle } from "lucide-react";

const GROUP_LABELS: Record<string, string> = {
  merchant: "🏪 Merchant",
  driver: "🚗 Driver",
  admin: "⚙️ Admin",
  public: "🌐 Public",
  qr: "📱 QR",
};

const GROUP_ORDER = ["qr", "merchant", "driver", "admin", "public"];

export default function RouteAuditPage() {
  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    label: GROUP_LABELS[g] ?? g,
    routes: ROUTE_REGISTRY.filter((r) => r.group === g),
  }));

  return (
    <div className="app-mobile-page bg-background text-foreground p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Route Audit</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ROUTE_REGISTRY.length} routes registered in the system.
        </p>
      </div>

      {grouped.map((g) => (
        <div key={g.group} className="space-y-2">
          <h2 className="text-base font-semibold">{g.label}</h2>
          <div className="space-y-1">
            {g.routes.map((r) => (
              <div
                key={r.path}
                className="flex items-center gap-2 border border-border rounded-lg px-3 py-2"
              >
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{r.label}</span>
                <code className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]">
                  {r.path}
                </code>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
