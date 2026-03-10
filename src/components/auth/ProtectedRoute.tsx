import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, emailVerified, activeRole, onboardingCompleted } = useAuth();
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

  // Keep onboarding accessible for brand-new users, but never force-redirect existing sessions to it.
  if (isOnboarding && onboardingCompleted) {
    const dest = activeRole === "tenant" ? "/tenant" : activeRole === "client" ? "/client" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  // Routes accessible to free/client accounts (publishing, communication, explore, marketplace)
  const FREE_ACCESS_PREFIXES = [
    "/dashboard/marketplace",
    "/dashboard/concierge",
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
    "/add-property",
    "/properties-showcase",
    "/host-catalog",
    "/rental-catalog",
    "/account-showcase",
  ];

  const isFreePath = FREE_ACCESS_PREFIXES.some(prefix => location.pathname.startsWith(prefix))
    || location.pathname === "/dashboard";

  // Client role: can access /client/*, free publishing routes, and onboarding
  if (activeRole === "client" && !isClientRoute && !isOnboarding && !isFreePath) {
    return <Navigate to="/client" replace />;
  }

  // Tenant role users should only access /tenant/* routes
  if (activeRole === "tenant" && !isTenantRoute && !isOnboarding) {
    return <Navigate to="/tenant" replace />;
  }

  // Landlord role users should not access /tenant/* or /client/* routes
  if (activeRole === "landlord" && (isTenantRoute || isClientRoute)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

