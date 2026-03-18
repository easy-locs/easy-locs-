/**
 * Centralized Role & Permissions System
 * 
 * Role hierarchy: owner > admin > agent > staff > accountant > member
 * 
 * This module defines what each role can do across all modules.
 * Used by useOrgRole() hook and PermissionGate component.
 */

export type OrgRole = "owner" | "admin" | "agent" | "staff" | "accountant" | "member";

export type Permission =
  // Organization
  | "org:manage" | "org:billing" | "org:invite"
  // Properties & Listings
  | "properties:read" | "properties:write" | "properties:delete"
  // Tenants & Leases
  | "tenants:read" | "tenants:write" | "leases:read" | "leases:write"
  // Financial
  | "payments:read" | "payments:write" | "accounting:read" | "accounting:write" | "expenses:read" | "expenses:write"
  // Communication
  | "messages:read" | "messages:write"
  // Calendar & Bookings
  | "bookings:read" | "bookings:write" | "bookings:manage"
  // Documents
  | "documents:read" | "documents:write" | "documents:sign"
  // Marketplace & Concierge
  | "services:read" | "services:write"
  // Leads
  | "leads:read" | "leads:write"
  // Interventions
  | "interventions:read" | "interventions:write"
  // Shop-level
  | "shop:manage" | "shop:catalog" | "shop:orders" | "shop:pos" | "shop:marketing" | "shop:support";

/** Role hierarchy level (higher = more power) */
const ROLE_LEVELS: Record<OrgRole, number> = {
  owner: 100,
  admin: 80,
  agent: 60,
  staff: 40,
  accountant: 30,
  member: 20,
};

/** Permissions granted to each role */
const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    "org:manage", "org:billing", "org:invite",
    "properties:read", "properties:write", "properties:delete",
    "tenants:read", "tenants:write", "leases:read", "leases:write",
    "payments:read", "payments:write", "accounting:read", "accounting:write", "expenses:read", "expenses:write",
    "messages:read", "messages:write",
    "bookings:read", "bookings:write", "bookings:manage",
    "documents:read", "documents:write", "documents:sign",
    "services:read", "services:write",
    "leads:read", "leads:write",
    "interventions:read", "interventions:write",
  ],
  admin: [
    "org:invite",
    "properties:read", "properties:write", "properties:delete",
    "tenants:read", "tenants:write", "leases:read", "leases:write",
    "payments:read", "payments:write", "accounting:read", "accounting:write", "expenses:read", "expenses:write",
    "messages:read", "messages:write",
    "bookings:read", "bookings:write", "bookings:manage",
    "documents:read", "documents:write", "documents:sign",
    "services:read", "services:write",
    "leads:read", "leads:write",
    "interventions:read", "interventions:write",
  ],
  agent: [
    "properties:read", "properties:write",
    "tenants:read", "tenants:write", "leases:read", "leases:write",
    "payments:read",
    "messages:read", "messages:write",
    "bookings:read", "bookings:write", "bookings:manage",
    "documents:read", "documents:write",
    "services:read",
    "leads:read", "leads:write",
    "interventions:read", "interventions:write",
  ],
  staff: [
    "properties:read",
    "tenants:read",
    "messages:read", "messages:write",
    "bookings:read", "bookings:write",
    "documents:read",
    "services:read",
    "leads:read",
    "interventions:read", "interventions:write",
  ],
  accountant: [
    "properties:read",
    "tenants:read", "leases:read",
    "payments:read", "payments:write", "accounting:read", "accounting:write", "expenses:read", "expenses:write",
    "documents:read",
  ],
  member: [
    "properties:read",
    "tenants:read",
    "messages:read",
    "bookings:read",
    "documents:read",
    "services:read",
    "leads:read",
    "interventions:read",
  ],
};

/** Check if a role has a specific permission */
export function roleHasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Get all permissions for a role */
export function getPermissions(role: OrgRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/** Check if roleA >= roleB in hierarchy */
export function isRoleAtLeast(role: OrgRole, minRole: OrgRole): boolean {
  return (ROLE_LEVELS[role] ?? 0) >= (ROLE_LEVELS[minRole] ?? 0);
}

/** Role display configuration */
export const ROLE_CONFIG: Record<OrgRole, { label: string; labelEn: string; description: string; color: string; icon: string }> = {
  owner: {
    label: "Propriétaire",
    labelEn: "Owner",
    description: "Full control over the organization",
    color: "text-amber-600",
    icon: "👑",
  },
  admin: {
    label: "Administrateur",
    labelEn: "Admin",
    description: "Manage team, properties, and all operations",
    color: "text-blue-600",
    icon: "🛡️",
  },
  agent: {
    label: "Agent",
    labelEn: "Agent",
    description: "Manage properties, bookings, leads, and communication",
    color: "text-green-600",
    icon: "🏠",
  },
  staff: {
    label: "Staff",
    labelEn: "Staff",
    description: "Handle bookings, messages, and interventions",
    color: "text-purple-600",
    icon: "👤",
  },
  accountant: {
    label: "Comptable",
    labelEn: "Accountant",
    description: "Access financial data, payments, and accounting",
    color: "text-orange-600",
    icon: "📊",
  },
  member: {
    label: "Membre",
    labelEn: "Member",
    description: "Read-only access to organization data",
    color: "text-muted-foreground",
    icon: "👁️",
  },
};

/** Roles available for invitation (owner cannot be assigned) */
export const INVITABLE_ROLES: OrgRole[] = ["admin", "agent", "staff", "accountant", "member"];
