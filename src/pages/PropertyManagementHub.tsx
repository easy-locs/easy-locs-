/**
 * PropertyManagementHub — V4 Role-based entry screen.
 * Route: /property-hub
 * 
 * Step 1: Choose role (Landlord / Tenant)
 * Step 2: Role-specific navigation
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2, User, LayoutDashboard, Home, Users, Receipt,
  Wrench, FileText, Calculator, Megaphone, CreditCard,
  ArrowLeft, ChevronRight, KeyRound, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";

type PMRole = null | "landlord" | "tenant";

/* ── Navigation items per role ── */
const landlordNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Properties", icon: Home, path: "/dashboard/properties" },
  { label: "Buildings & Units", icon: Building2, path: "/dashboard/buildings" },
  { label: "Tenants", icon: Users, path: "/dashboard/tenants" },
  { label: "Rent Tracking", icon: Receipt, path: "/dashboard/notices" },
  { label: "Maintenance", icon: Wrench, path: "/dashboard/interventions" },
  { label: "Documents", icon: FileText, path: "/dashboard/documents" },
  { label: "Accounting", icon: Calculator, path: "/dashboard/accounting" },
  { label: "Publish Listings", icon: Megaphone, path: "/dashboard/real-estate" },
];

const tenantNav = [
  { label: "My Property", icon: Home, path: "/tenant" },
  { label: "My Rent", icon: Receipt, path: "/tenant/receipts" },
  { label: "Payments", icon: CreditCard, path: "/tenant/pay" },
  { label: "Maintenance Requests", icon: Wrench, path: "/tenant/requests" },
  { label: "Documents", icon: FileText, path: "/tenant/documents" },
];

export default function PropertyManagementHub() {
  const [role, setRole] = useState<PMRole>(null);
  const navigate = useNavigate();

  const navItems = role === "landlord" ? landlordNav : role === "tenant" ? tenantNav : [];

  return (
    <>
      <SEOHead title="Property Management" description="Manage your properties and tenancies." />
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader
          title={role ? (role === "landlord" ? "Landlord Hub" : "Tenant Hub") : "Property Management"}
          icon={<Building2 className="h-5 w-5 text-primary" />}
          backTo="/dashboard"
        />

        <div className="max-w-lg mx-auto px-4 py-6">
          {/* ── Step 1: Role selection ── */}
          {!role && (
            <div className="space-y-6">
              <div className="text-center space-y-2 pt-8">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Property Management</h2>
                <p className="text-sm text-muted-foreground">Choose your role to get started</p>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={() => setRole("landlord")}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-2xl border border-border",
                    "bg-card hover:bg-accent/50 transition-all duration-200",
                    "active:scale-[0.98] hover:shadow-lg hover:shadow-primary/5",
                    "group cursor-pointer"
                  )}
                >
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <KeyRound className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold">Landlord</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage properties, tenants, rent & maintenance</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <button
                  onClick={() => setRole("tenant")}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-2xl border border-border",
                    "bg-card hover:bg-accent/50 transition-all duration-200",
                    "active:scale-[0.98] hover:shadow-lg hover:shadow-primary/5",
                    "group cursor-pointer"
                  )}
                >
                  <div className="h-14 w-14 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0 group-hover:bg-secondary transition-colors">
                    <User className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold">Tenant</p>
                    <p className="text-xs text-muted-foreground mt-0.5">View rent, payments, documents & requests</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Role-based navigation ── */}
          {role && (
            <div className="space-y-3">
              {/* Back to role selection */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground -ml-2 mb-2"
                onClick={() => setRole(null)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change role
              </Button>

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border border-border",
                      "bg-card hover:bg-accent/50 transition-all duration-200",
                      "active:scale-[0.98] hover:shadow-md hover:shadow-primary/5",
                      "group cursor-pointer"
                    )}
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
