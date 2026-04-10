/**
 * PermissionGate — conditionally renders children based on user's org role.
 * 
 * Usage:
 *   <PermissionGate permission="payments:write">
 *     <PaymentButton />
 *   </PermissionGate>
 * 
 *   <PermissionGate minRole="admin" fallback={<UpgradeBanner />}>
 *     <AdminPanel />
 *   </PermissionGate>
 */
import { useOrgRole } from "@/hooks/useOrgRole";
import type { Permission, OrgRole } from "@/lib/permissions";

interface PermissionGateProps {
  children: React.ReactNode;
  /** Required permission */
  permission?: Permission;
  /** Minimum role level */
  minRole?: OrgRole;
  /** Fallback UI when access denied */
  fallback?: React.ReactNode;
}

export function PermissionGate({ children, permission, minRole, fallback = null }: PermissionGateProps) {
  const { can, isAtLeast } = useOrgRole();

  const hasAccess = 
    (permission ? can(permission) : true) &&
    (minRole ? isAtLeast(minRole) : true);

  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}
