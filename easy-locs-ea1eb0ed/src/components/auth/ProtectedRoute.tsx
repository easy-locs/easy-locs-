import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession, useAuthProfile } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminAccessDenied from "@/components/auth/AdminAccessDenied";

/** Dashboard paths that require an active subscription (pro features) */
const PRO_DASHBOARD_PREFIXES = [
  "/dashboard/rental-management",
  "/dashboard/leases",
  "/dashboard/finances",
  "/dashboard/accounting",
  "/dashboard/documents",
  "/dashboard/interventions",
  "/dashboard/calendar",
  "/dashboard/channels",
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

function InlineSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-6">
      <div className="h-6 w-32 rounded-lg skeleton-premium mb-4" />
      <div className="h-28 w-full rounded-2xl skeleton-premium mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-xl skeleton-premium" />)}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded skeleton-premium" />
        <div className="h-4 w-1/2 rounded skeleton-premium" />
      </div>
    </div>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, emailVerified, profileLoaded } = useAuthSession();
  const { subscription } = useAuthProfile();
  const location = useLocation();

  if (loading) return <InlineSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!profileLoaded) return <InlineSkeleton />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isBuilderRoute = location.pathname.startsWith("/builder");

  if (!subscription.loading && !subscription.subscribed) {
    const isProPath = PRO_DASHBOARD_PREFIXES.some(prefix => location.pathname.startsWith(prefix));
    if (isProPath) return <Navigate to="/dashboard/billing" replace />;
  }

  if (isAdminRoute || isBuilderRoute) return <AdminGate>{children}</AdminGate>;

  return <>{children}</>;
};

function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, denialReason, email } = useIsAdmin();
  if (isLoading) return <InlineSkeleton />;
  if (!isAdmin) {
    return (
      <AdminAccessDenied
        reason={denialReason ?? "unknown"}
        email={email}
      />
    );
  }
  return <>{children}</>;
}

export default ProtectedRoute;
