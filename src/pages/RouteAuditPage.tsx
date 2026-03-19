/**
 * Route Audit Page — Lists all registered routes and their health status.
 */
import { routes } from "@/lib/routes";
import { CheckCircle } from "lucide-react";

interface RouteEntry {
  label: string;
  path: string;
  group: "merchant" | "driver" | "admin" | "public" | "qr";
}

const ROUTE_REGISTRY: RouteEntry[] = [
  { label: "QR Entry", path: routes.qrEntry("TEST"), group: "qr" },
  { label: "Order Tracking", path: routes.tracking("TEST"), group: "public" },
  { label: "Merchant POS", path: routes.merchantPos(), group: "merchant" },
  { label: "Merchant Kitchen", path: routes.merchantKitchen(), group: "merchant" },
  { label: "Delivery Monitor", path: routes.merchantDelivery(), group: "merchant" },
  { label: "Driver Missions", path: routes.driverMissions(), group: "driver" },
  { label: "Driver Earnings", path: routes.driverEarnings(), group: "driver" },
  { label: "Driver Mission Detail", path: routes.driverMission("TEST"), group: "driver" },
  { label: "Wallet Diagnostics", path: routes.walletDiagnostics(), group: "admin" },
  { label: "Dispatch Diagnostics", path: routes.dispatchDiagnostics(), group: "admin" },
  { label: "Automations", path: routes.automations(), group: "admin" },
  { label: "Automation Health", path: routes.automationHealth(), group: "admin" },
  { label: "Ops Exceptions", path: routes.opsExceptions(), group: "admin" },
  { label: "Review Queue", path: routes.reviewQueue(), group: "admin" },
  { label: "Growth Dashboard", path: routes.growthDashboard(), group: "admin" },
  { label: "Growth Engine", path: routes.growthEngine(), group: "admin" },
  { label: "Import Test Batches", path: routes.importTestBatches(), group: "admin" },
  { label: "Coming Soon", path: routes.comingSoon("test-slug"), group: "public" },
  { label: "City Market", path: routes.cityMarket("dubai"), group: "public" },
];

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
    <div className="min-h-screen bg-background text-foreground p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Route Audit</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ROUTE_REGISTRY.length} routes enregistrées dans le système.
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
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
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
