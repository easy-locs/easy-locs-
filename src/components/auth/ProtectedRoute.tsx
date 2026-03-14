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

  // Keep onboarding accessible for brand-new users, but never force-redirect existing sessions to it.
  if (isOnboarding && onboardingCompleted) {
    const dest = activeRole === "tenant" ? "/tenant" : activeRole === "client" ? "/client" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  // Routes accessible to free/client accounts (publishing, communication, explore, marketplace)
  const FREE_ACCESS_PREFIXES = [
    "/dashboard/marketplace",
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

  const isFreePath = FREE_ACCESS_PREFIXES.some(prefix => location.pathname.startsWith(prefix))
    || location.pathname === "/dashboard";

  // Client role: can access /client/*, /app/*, free publishing routes, and onboarding
  if (activeRole === "client" && !isClientRoute && !isAppRoute && !isOnboarding && !isFreePath) {
    return <Navigate to="/client" replace />;
  }

  // Tenant role users should only access /tenant/* or /app/* routes
  if (activeRole === "tenant" && !isTenantRoute && !isAppRoute && !isOnboarding) {
    return <Navigate to="/tenant" replace />;
  }

  // Landlord role users should not access /tenant/* or /client/* routes
  if (activeRole === "landlord" && (isTenantRoute || isClientRoute)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Subscription gate: redirect free landlord accounts away from pro pages
  if (activeRole === "landlord" && !subscription.loading && !subscription.subscribed) {
    const isProPath = PRO_DASHBOARD_PREFIXES.some(prefix => location.pathname.startsWith(prefix));
    if (isProPath) {
      return <Navigate to="/dashboard/billing" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

