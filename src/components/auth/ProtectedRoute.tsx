import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, emailVerified, subscription } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // Allow billing page always so user can subscribe
  const isBillingPage = location.pathname === "/dashboard/billing";
  const isOnboarding = location.pathname === "/onboarding";

  // If subscription check is done and not active, redirect to billing (except billing & onboarding)
  if (!subscription.loading && !subscription.subscribed && !isBillingPage && !isOnboarding) {
    return <Navigate to="/dashboard/billing" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
