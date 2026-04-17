/**
 * AdminRoute — Route guard that verifies the user has an 'admin' or 'owner' role
 * via the shared `useIsAdmin` hook (server-side `has_role` RPC).
 *
 * On failure it shows a clear access-denied message instead of redirecting
 * silently, so the user understands why the page is unavailable.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Loader2 } from "lucide-react";
import AdminAccessDenied from "@/components/auth/AdminAccessDenied";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading } = useIsAdmin();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <AdminAccessDenied />;

  return <>{children}</>;
};

export default AdminRoute;
