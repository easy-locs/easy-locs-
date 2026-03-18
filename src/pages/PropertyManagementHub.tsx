/**
 * PropertyManagementHub — V4 Role-based entry screen.
 * Route: /property-hub
 * 
 * Step 1: Choose role (Landlord / Tenant)
 * Step 2: Role-specific navigation
 * 
 * UX: One screen = one decision. Premium futuristic feel.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import {
  Building2, User, LayoutDashboard, Home, Users, Receipt,
  Wrench, FileText, Calculator, Megaphone, CreditCard,
  ArrowLeft, ChevronRight, KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";

type PMRole = null | "landlord" | "tenant";

/* ── Navigation items per role ── */
const landlordNav = [
  { label: "Dashboard", desc: "Overview & KPIs", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Portfolio", desc: "All your properties", icon: Building2, path: "/dashboard/properties" },
  { label: "Buildings & Units", desc: "Units & floors", icon: Home, path: "/dashboard/buildings" },
  { label: "Tenants", desc: "Tenant directory", icon: Users, path: "/dashboard/tenants" },
  { label: "Rent Tracking", desc: "Payments & notices", icon: Receipt, path: "/dashboard/notices" },
  { label: "Maintenance", desc: "Requests & interventions", icon: Wrench, path: "/dashboard/interventions" },
  { label: "Documents", desc: "Leases, contracts, files", icon: FileText, path: "/dashboard/documents" },
  { label: "Accounting", desc: "Revenue & expenses", icon: Calculator, path: "/dashboard/accounting" },
  { label: "Publish Listings", desc: "Advertise vacancies", icon: Megaphone, path: "/dashboard/real-estate" },
];

const tenantNav = [
  { label: "My Property", desc: "Your current home", icon: Home, path: "/tenant" },
  { label: "My Rent", desc: "Receipts & history", icon: Receipt, path: "/tenant/receipts" },
  { label: "Payments", desc: "Pay rent & bills", icon: CreditCard, path: "/tenant/pay" },
  { label: "Maintenance Requests", desc: "Report issues", icon: Wrench, path: "/tenant/requests" },
  { label: "Documents", desc: "Lease & shared files", icon: FileText, path: "/tenant/documents" },
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
          {/* ── Step 1: Role selection — ONE DECISION ── */}
          {!role && (
            <div className="space-y-8">
              <div className="text-center space-y-3 pt-10">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto shadow-lg shadow-primary/10">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Property Management</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">Choose your role to access your dedicated workspace</p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Landlord */}
                <button
                  onClick={() => setRole("landlord")}
                  className={cn(
                    "w-full flex items-center gap-5 p-6 rounded-2xl",
                    "bg-card border border-border/50",
                    "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
                    "active:scale-[0.98] transition-all duration-300 ease-out",
                    "group cursor-pointer"
                  )}
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold tracking-tight">Landlord</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Manage properties, tenants, rent & maintenance
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                </button>

                {/* Tenant */}
                <button
                  onClick={() => setRole("tenant")}
                  className={cn(
                    "w-full flex items-center gap-5 p-6 rounded-2xl",
                    "bg-card border border-border/50",
                    "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
                    "active:scale-[0.98] transition-all duration-300 ease-out",
                    "group cursor-pointer"
                  )}
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center shrink-0 group-hover:from-secondary/50 group-hover:to-secondary/20 transition-all duration-300">
                    <User className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold tracking-tight">Tenant</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      View rent, payments, documents & requests
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Role-based navigation ── */}
          {role && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground -ml-2 mb-1 hover:text-primary"
                onClick={() => setRole(null)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change role
              </Button>

              <div className="space-y-2.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl",
                        "bg-card border border-border/50",
                        "hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
                        "active:scale-[0.98] transition-all duration-200 ease-out",
                        "group cursor-pointer"
                      )}
                    >
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-200">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold truncate">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
