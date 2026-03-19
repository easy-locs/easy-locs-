/**
 * RealEstateModule — Main hub for the real-estate domain.
 * Route: /real-estate
 */
import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { cn } from "@/lib/utils";
import { Building2, Users, KeyRound, Receipt, FileText, Home } from "lucide-react";

const tabs = [
  { label: "Properties", path: "/real-estate", icon: Building2 },
  { label: "Units", path: "/real-estate/units", icon: Home },
  { label: "Tenants", path: "/real-estate/tenants", icon: Users },
  { label: "Leases", path: "/real-estate/leases", icon: KeyRound },
  { label: "Payments", path: "/real-estate/payments", icon: Receipt },
  { label: "Documents", path: "/real-estate/documents", icon: FileText },
];

export default function RealEstateModule() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/real-estate") return location.pathname === "/real-estate";
    return location.pathname.startsWith(path);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4">
          <MobilePageHeader title="Real Estate" backPath="/property-hub" />

          {/* Tab navigation */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <Outlet />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
