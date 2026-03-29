import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { hasRole } from "@/repositories/auth-utils.repository";

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

/** Inline skeleton — never blocks full screen */
function InlineSkeleton() {
  return (
    <div className="px-4 py-6 space-y-4 max-w-md mx-auto animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-muted/40" />
      <div className="h-4 w-56 rounded-lg bg-muted/30" />
      <div className="space-y-3 pt-2">
        <div className="h-20 w-full rounded-2xl bg-muted/30" />
        <div className="h-20 w-full rounded-2xl bg-muted/25" />
        <div className="h-20 w-full rounded-2xl bg-muted/20" />
      </div>
    </div>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, emailVerified, activeRole, onboardingCompleted, profileLoaded, subscription } = useAuth();
  const location = useLocation();

  if (loading) return <InlineSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profileLoaded) return <InlineSkeleton />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;

  const isOnboarding = location.pathname === "/onboarding";
  const isTenantRoute = location.pathname.startsWith("/tenant");
  const isClientRoute = location.pathname.startsWith("/client");
  const isAppRoute = location.pathname.startsWith("/app");
  const isPropertyManagementPath = [
    "/dashboard/properties", "/dashboard/buildings", "/dashboard/tenants",
    "/dashboard/payment-notices", "/dashboard/interventions", "/dashboard/documents",
    "/dashboard/accounting", "/dashboard/receipts", "/dashboard/wallet",
    "/dashboard/add-property", "/dashboard/real-estate",
  ].some(prefix => location.pathname.startsWith(prefix));
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (!onboardingCompleted && !isOnboarding) return <Navigate to="/onboarding" replace />;
  if (isOnboarding && onboardingCompleted) {
    const dest = activeRole === "tenant" ? "/tenant" : activeRole === "client" ? "/client" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  const FREE_ACCESS_PREFIXES = [
    "/dashboard/my-shop", "/dashboard/activities", "/dashboard/real-estate",
    "/dashboard/seasonal", "/dashboard/messages", "/dashboard/communication",
    "/dashboard/billing", "/dashboard/settings", "/dashboard/company",
    "/dashboard/onboarding", "/explore", "/messages", "/dashboard/add-property",
    "/dashboard/create-listing", "/properties-showcase", "/host-catalog",
    "/rental-catalog", "/account-showcase",
  ];
  const isFreePath = FREE_ACCESS_PREFIXES.some(prefix => location.pathname.startsWith(prefix)) || location.pathname === "/dashboard";

  if (activeRole === "client" && !isClientRoute && !isAppRoute && !isOnboarding && !isFreePath && !isPropertyManagementPath && !isAdminRoute) {
    return <Navigate to="/client" replace />;
  }
  if (activeRole === "tenant" && !isTenantRoute && !isAppRoute && !isOnboarding && !isPropertyManagementPath && !isFreePath && !isAdminRoute) {
    return <Navigate to="/tenant" replace />;
  }
  if (activeRole === "landlord" && (isTenantRoute || isClientRoute)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!subscription.loading && !subscription.subscribed) {
    const isProPath = PRO_DASHBOARD_PREFIXES.some(prefix => location.pathname.startsWith(prefix));
    if (isProPath) return <Navigate to="/dashboard/billing" replace />;
  }

  if (isAdminRoute) return <AdminGate>{children}</AdminGate>;

  return <>{children}</>;
};

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) { setChecking(false); return; }
    let cancelled = false;
    (async () => {
      const [admin, owner] = await Promise.all([
        hasRole(user.id, "admin"),
        hasRole(user.id, "owner"),
      ]);
      if (!cancelled) {
        setIsAdmin(!!admin || !!owner);
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (checking) return <InlineSkeleton />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default ProtectedRoute;
