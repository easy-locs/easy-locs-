/**
 * Hook to get the current user's role and permissions within the active organization.
 * Uses the centralized permissions system from src/lib/permissions.ts.
 */
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";
import { useQuery } from "@tanstack/react-query";
import { roleHasPermission, isRoleAtLeast, getPermissions, type OrgRole, type Permission } from "@/lib/permissions";

export function useOrgRole() {
  const { user, orgId } = useAuth();

  const { data: orgRole = "member" as OrgRole, isLoading } = useQuery({
    queryKey: ["org_role", user?.id, orgId],
    queryFn: async () => {
      if (!user?.id || !orgId) return "member" as OrgRole;
      const { data } = await db("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .limit(1)
        .maybeSingle();
      return (data?.role as OrgRole) || "member";
    },
    enabled: !!user?.id && !!orgId,
    staleTime: 60_000,
  });

  return {
    role: orgRole,
    loading: isLoading,
    /** Check if user has a specific permission */
    can: (permission: Permission) => roleHasPermission(orgRole, permission),
    /** Check if user's role is at least the given minimum */
    isAtLeast: (minRole: OrgRole) => isRoleAtLeast(orgRole, minRole),
    /** Get all current permissions */
    permissions: getPermissions(orgRole),
  };
}
