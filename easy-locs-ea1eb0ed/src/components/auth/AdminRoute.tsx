/**
 * AdminRoute — Route guard that verifies the user has an 'admin' or 'owner' role
 * via the server-side has_role RPC. Redirects non-admins to /dashboard.
 */
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasRole } from "@/repositories/auth-utils.repository";
import { Loader2 } from "lucide-react";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    (async () => {
      // Check admin OR owner role
      const adminResult = await hasRole(user.id, "admin");

      if (cancelled) return;

      if (adminResult) {
        setIsAdmin(true);
        setChecking(false);
        return;
      }

      const ownerResult = await hasRole(user.id, "owner");

      if (cancelled) return;
      setIsAdmin(!!ownerResult);
      setChecking(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default AdminRoute;
