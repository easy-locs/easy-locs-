import { Link } from "react-router-dom";
import { routes } from "@/lib/routes";
import { ExternalLink } from "lucide-react";

const LINKS = [
  { label: "QR Generate", to: routes.qrGenerate() },
  { label: "Route Audit", to: routes.routeAudit() },
  { label: "Runtime Audit", to: "/admin/runtime-audit" },
  { label: "Master Debug", to: "/admin/master-debug" },
  { label: "Restaurant Seeder", to: routes.restaurantSeedTest() },
  { label: "Dispatch Diagnostics", to: routes.dispatchDiagnostics() },
  { label: "Automations", to: routes.automations() },
  { label: "Merchant POS", to: routes.merchantPos() },
  { label: "Merchant Delivery", to: routes.merchantDelivery() },
  { label: "Driver Missions", to: routes.driverMissions() },
  { label: "Orbit Call Test", to: routes.orbitCallTest() },
  { label: "Wallet Diagnostics", to: routes.walletDiagnostics() },
  { label: "Growth Engine", to: routes.growthEngine() },
];

export default function AdminRuntimeQuickLinksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Runtime Quick Links</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fast route test to catch empty pages, broken routes, or 404 issues.
        </p>
      </div>

      <div className="grid gap-2">
        {LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center justify-between border border-border rounded-lg px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <code className="text-xs text-muted-foreground">{item.to}</code>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
