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

  const { data: orgRole = "member" as OrgRole, isLoading, isError } = useQuery({
    queryKey: ["org_role", user?.id, orgId],
    queryFn: async () => {
      if (!user?.id || !orgId) return "member" as OrgRole;
      const { data, error } = await db("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[useOrgRole] Failed to fetch org role:", error.message);
        throw error;
      }
      return (data?.role as OrgRole) || "member";
    },
    enabled: !!user?.id && !!orgId,
    staleTime: 60_000,
    retry: 2,
  });

  const effectiveRole = isError ? "member" as OrgRole : orgRole;

  return {
    role: effectiveRole,
    loading: isLoading,
    error: isError,
    roleUnavailable: isError || isLoading,
    can: (permission: Permission) => !isError && !isLoading && roleHasPermission(effectiveRole, permission),
    isAtLeast: (minRole: OrgRole) => !isError && !isLoading && isRoleAtLeast(effectiveRole, minRole),
    permissions: isError || isLoading ? [] as Permission[] : getPermissions(effectiveRole),
  };
}
