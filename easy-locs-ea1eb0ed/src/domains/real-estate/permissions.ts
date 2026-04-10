import type { RealEstateRole, AgentPermission } from "./canonical-types";

const ROLE_PERMISSIONS: Record<RealEstateRole, AgentPermission[]> = {
  super_admin: [
    "read", "edit", "publish", "archive",
    "finance_access", "documents_access", "maintenance_access",
    "analytics_access", "branch_access", "role_management",
  ],
  business_owner: [
    "read", "edit", "publish", "archive",
    "finance_access", "documents_access", "maintenance_access",
    "analytics_access", "branch_access", "role_management",
  ],
  property_manager: [
    "read", "edit", "publish",
    "documents_access", "maintenance_access", "analytics_access",
  ],
  leasing_manager: [
    "read", "edit", "publish",
    "documents_access", "analytics_access",
  ],
  sales_manager: [
    "read", "edit", "publish",
    "analytics_access",
  ],
  agent: [
    "read", "edit",
  ],
  finance_manager: [
    "read", "finance_access", "analytics_access",
  ],
  maintenance_manager: [
    "read", "maintenance_access",
  ],
  staff: [
    "read",
  ],
  landlord: [
    "read", "documents_access", "maintenance_access",
  ],
  tenant: [
    "read", "maintenance_access",
  ],
  external_provider: [
    "read", "maintenance_access",
  ],
};

export function hasPermission(role: RealEstateRole, permission: AgentPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: RealEstateRole): AgentPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canPublish(role: RealEstateRole): boolean {
  return hasPermission(role, "publish");
}

export function canAccessFinance(role: RealEstateRole): boolean {
  return hasPermission(role, "finance_access");
}

export function canManageMaintenance(role: RealEstateRole): boolean {
  return hasPermission(role, "maintenance_access");
}

export function canManageRoles(role: RealEstateRole): boolean {
  return hasPermission(role, "role_management");
}

export function canEdit(role: RealEstateRole): boolean {
  return hasPermission(role, "edit");
}

export function canAccessAnalytics(role: RealEstateRole): boolean {
  return hasPermission(role, "analytics_access");
}
