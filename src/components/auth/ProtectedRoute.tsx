import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/** Dashboard paths that require an active subscription (pro features) */
const PRO_DASHBOARD_PREFIXES = [
  "/dashboard/rental",
  "/dashboard/leases",
  "/dashboard/finances",
  "/dashboard/accounting",
  "/dashboard/documents",
  "/dashboard/interventions",
  "/dashboard/calendar",
  "/dashboard/channel-manager",
  "/dashboard/dynamic-pricing",
  "/dashboard/fiscal",
  "/dashboard/expenses",
  "/dashboard/receipts",
  "/dashboard/payment-notices",
  "/dashboard/dunning",
  "/dashboard/charges",
  "/dashboard/vault",
  "/dashboard/audit",
  "/dashboard/candidates",
  "/dashboard/buildings",
  "/dashboard/collaboration",
  "/dashboard/reminders",
  "/dashboard/data-import",
  "/dashboard/developer",
];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, emailVerified, activeRole, onboardingCompleted, subscription } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;

  const isOnboarding = location.pathname === "/onboarding";
  const isTenantRoute = location.pathname.startsWith("/tenant");
  const isClientRoute = location.pathname.startsWith("/client");
  const isAppRoute = location.pathname.startsWith("/app");
  const isPropertyHubRoute = location.pathname.startsWith("/property-hub");

  // Keep onboarding accessible for brand-new users, but never force-redirect existing sessions to it.
  if (isOnboarding && onboardingCompleted) {
    const dest = activeRole === "tenant" ? "/tenant" : activeRole === "client" ? "/client" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  // Routes accessible to free/client accounts (publishing, communication, explore, marketplace)
  const FREE_ACCESS_PREFIXES = [
    "/dashboard/my-shop",
    "/dashboard/activities",
    "/dashboard/real-estate",
    "/dashboard/seasonal",
    "/dashboard/messages",
    "/dashboard/communication",
    "/dashboard/billing",
    "/dashboard/settings",
    "/dashboard/company",
    "/dashboard/onboarding",
    "/explore",
    "/messages",
    "/dashboard/add-property",
    "/dashboard/create-listing",
    "/properties-showcase",
    "/host-catalog",
    "/rental-catalog",
    "/account-showcase",
  ];

  // Property-management dashboard paths accessible from Property Hub regardless of role
  const PROPERTY_MANAGEMENT_PREFIXES = [
    "/dashboard/properties",
    "/dashboard/buildings",
    "/dashboard/tenants",
    "/dashboard/payment-notices",
    "/dashboard/interventions",
    "/dashboard/documents",
    "/dashboard/accounting",
    "/dashboard/receipts",
    "/dashboard/wallet",
    "/dashboard/add-property",
    "/dashboard/real-estate",
  ];

  const isFreePath = FREE_ACCESS_PREFIXES.some(prefix => location.pathname.startsWith(prefix))
    || location.pathname === "/dashboard";

  const isPropertyManagementPath = PROPERTY_MANAGEMENT_PREFIXES.some(prefix => location.pathname.startsWith(prefix));

  // Client role: can access /client/*, /app/*, free publishing routes, property management, and onboarding
  if (activeRole === "client" && !isClientRoute && !isAppRoute && !isOnboarding && !isFreePath && !isPropertyManagementPath) {
    return <Navigate to="/client" replace />;
  }

  // Tenant role: can access /tenant/*, /app/*, and property management dashboard routes (navigated from Property Hub)
  if (activeRole === "tenant" && !isTenantRoute && !isAppRoute && !isOnboarding && !isPropertyManagementPath && !isFreePath) {
    return <Navigate to="/tenant" replace />;
  }

  // Landlord role users should not access /tenant/* or /client/* routes
  if (activeRole === "landlord" && (isTenantRoute || isClientRoute)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Subscription gate: redirect free accounts away from pro pages (applies to ALL roles)
  if (!subscription.loading && !subscription.subscribed) {
    const isProPath = PRO_DASHBOARD_PREFIXES.some(prefix => location.pathname.startsWith(prefix));
    if (isProPath) {
      return <Navigate to="/dashboard/billing" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

