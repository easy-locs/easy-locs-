import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import type { AppRole } from "@/lib/types/domain";

export function RoleGuard(props: {
  allowed: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const identity = useOrbitIdentity();
  const role = identity?.role as AppRole | undefined;

  if (!role || !props.allowed.includes(role)) {
    return (
      <>
        {props.fallback ?? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Access denied</p>
          </div>
        )}
      </>
    );
  }

  return <>{props.children}</>;
}
