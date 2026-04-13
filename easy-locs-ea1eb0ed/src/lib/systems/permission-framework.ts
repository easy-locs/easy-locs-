import { platformBus } from "@/lib/shared/platform-bus";

export type Role = "user" | "seller" | "admin" | "staff" | "tenant" | "landlord" | "provider" | "driver" | "moderator" | "support_agent";

export type Permission =
  | "read" | "write" | "delete" | "manage"
  | "publish" | "unpublish" | "moderate"
  | "pay" | "refund" | "transfer"
  | "assign" | "escalate" | "override";

export type Scope =
  | "own" | "org" | "global"
  | "listing" | "transaction" | "wallet" | "conversation"
  | "support_ticket" | "user_profile" | "engine" | "admin_panel";

export type Visibility = "public" | "private" | "restricted" | "unlisted" | "org_only";

export interface PermissionRule {
  role: Role;
  permission: Permission;
  scope: Scope;
  conditions?: Record<string, unknown>;
}

export interface OwnershipRule {
  resourceType: string;
  ownerField: string;
  orgField: string | null;
  canDelegateToOrg: boolean;
}

const PERMISSION_MATRIX: PermissionRule[] = [
  { role: "user", permission: "read", scope: "own" },
  { role: "user", permission: "write", scope: "own" },
  { role: "user", permission: "pay", scope: "wallet" },
  { role: "user", permission: "read", scope: "listing" },

  { role: "seller", permission: "read", scope: "own" },
  { role: "seller", permission: "write", scope: "own" },
  { role: "seller", permission: "publish", scope: "listing" },
  { role: "seller", permission: "unpublish", scope: "listing" },
  { role: "seller", permission: "manage", scope: "listing" },
  { role: "seller", permission: "read", scope: "transaction" },
  { role: "seller", permission: "refund", scope: "transaction", conditions: { maxAmount: 500 } },

  { role: "tenant", permission: "read", scope: "own" },
  { role: "tenant", permission: "pay", scope: "wallet" },
  { role: "tenant", permission: "read", scope: "transaction" },

  { role: "landlord", permission: "read", scope: "org" },
  { role: "landlord", permission: "write", scope: "org" },
  { role: "landlord", permission: "manage", scope: "listing" },
  { role: "landlord", permission: "read", scope: "transaction" },

  { role: "provider", permission: "read", scope: "own" },
  { role: "provider", permission: "write", scope: "own" },
  { role: "provider", permission: "publish", scope: "listing" },
  { role: "provider", permission: "manage", scope: "listing" },

  { role: "driver", permission: "read", scope: "own" },
  { role: "driver", permission: "write", scope: "own" },

  { role: "moderator", permission: "moderate", scope: "global" },
  { role: "moderator", permission: "read", scope: "global" },
  { role: "moderator", permission: "unpublish", scope: "listing" },

  { role: "support_agent", permission: "read", scope: "global" },
  { role: "support_agent", permission: "manage", scope: "support_ticket" },
  { role: "support_agent", permission: "refund", scope: "transaction" },

  { role: "staff", permission: "read", scope: "org" },
  { role: "staff", permission: "write", scope: "org" },

  { role: "admin", permission: "read", scope: "global" },
  { role: "admin", permission: "write", scope: "global" },
  { role: "admin", permission: "delete", scope: "global" },
  { role: "admin", permission: "manage", scope: "global" },
  { role: "admin", permission: "override", scope: "global" },
  { role: "admin", permission: "moderate", scope: "global" },
];

const OWNERSHIP_RULES: OwnershipRule[] = [
  { resourceType: "listing", ownerField: "seller_id", orgField: "org_id", canDelegateToOrg: true },
  { resourceType: "transaction", ownerField: "buyer_id", orgField: null, canDelegateToOrg: false },
  { resourceType: "wallet_account", ownerField: "owner_user_id", orgField: null, canDelegateToOrg: false },
  { resourceType: "conversation", ownerField: "created_by", orgField: null, canDelegateToOrg: false },
  { resourceType: "property", ownerField: "owner_user_id", orgField: "org_id", canDelegateToOrg: true },
  { resourceType: "support_ticket", ownerField: "creator_id", orgField: null, canDelegateToOrg: false },
  { resourceType: "unit", ownerField: "owner_user_id", orgField: "org_id", canDelegateToOrg: true },
  { resourceType: "lease", ownerField: "landlord_user_id", orgField: null, canDelegateToOrg: false },
];

export function hasPermission(role: Role, permission: Permission, scope: Scope): boolean {
  return PERMISSION_MATRIX.some(
    (r) => r.role === role && r.permission === permission && (r.scope === scope || r.scope === "global")
  );
}

export function getPermissionsForRole(role: Role): PermissionRule[] {
  return PERMISSION_MATRIX.filter((r) => r.role === role);
}

export function getOwnershipRule(resourceType: string): OwnershipRule | undefined {
  return OWNERSHIP_RULES.find((r) => r.resourceType === resourceType);
}

export function checkOwnership(
  resourceType: string,
  resource: Record<string, unknown>,
  userId: string,
  orgId?: string
): boolean {
  const rule = getOwnershipRule(resourceType);
  if (!rule) return false;
  if (resource[rule.ownerField] === userId) return true;
  if (rule.canDelegateToOrg && rule.orgField && orgId && resource[rule.orgField] === orgId) return true;
  return false;
}

export function getVisibilityForRole(role: Role): Visibility[] {
  switch (role) {
    case "admin":
    case "moderator":
      return ["public", "private", "restricted", "unlisted", "org_only"];
    case "staff":
      return ["public", "org_only"];
    default:
      return ["public"];
  }
}

export function emitPermissionDenied(userId: string, action: string, resource: string): void {
  platformBus.emit("system:module_status_changed", {
    module: "permission",
    status: "denied",
    userId,
    action,
    resource,
    timestamp: Date.now(),
  }, "security");
}
