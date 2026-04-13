import { platformBus } from "@/lib/shared/platform-bus";

export type TenantType = "individual" | "business" | "enterprise" | "franchise";
export type TenantStatus = "active" | "suspended" | "trial" | "cancelled" | "pending_setup";
export type PlanTier = "free" | "starter" | "growth" | "business" | "enterprise";

export interface Tenant {
  tenantId: string;
  ownerId: string;
  type: TenantType;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: PlanTier;
  country: string;
  currency: string;
  timezone: string;
  logo: string | null;
  primaryColor: string | null;
  verticals: string[];
  memberCount: number;
  maxMembers: number;
  createdAt: number;
  trialEndsAt: number | null;
}

export interface TenantMember {
  memberId: string;
  tenantId: string;
  userId: string;
  role: "owner" | "admin" | "manager" | "staff" | "viewer";
  permissions: string[];
  joinedAt: number;
  status: "active" | "invited" | "suspended";
}

export interface TenantQuota {
  planTier: PlanTier;
  maxListings: number;
  maxProducts: number;
  maxStaff: number;
  maxLocations: number;
  maxStorage: number;
  commissionOverride: number | null;
  features: string[];
}

export interface TenantBranding {
  tenantId: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string | null;
  customDomain: string | null;
  emailFrom: string | null;
  socialLinks: Record<string, string>;
}

const PLAN_QUOTAS: Record<PlanTier, TenantQuota> = {
  free: { planTier: "free", maxListings: 5, maxProducts: 10, maxStaff: 1, maxLocations: 1, maxStorage: 100, commissionOverride: null, features: ["basic_analytics"] },
  starter: { planTier: "starter", maxListings: 25, maxProducts: 100, maxStaff: 3, maxLocations: 2, maxStorage: 1000, commissionOverride: null, features: ["basic_analytics", "email_support"] },
  growth: { planTier: "growth", maxListings: 100, maxProducts: 1000, maxStaff: 10, maxLocations: 5, maxStorage: 5000, commissionOverride: null, features: ["advanced_analytics", "priority_support", "api_access", "custom_branding"] },
  business: { planTier: "business", maxListings: 500, maxProducts: 10000, maxStaff: 50, maxLocations: 20, maxStorage: 25000, commissionOverride: 0.08, features: ["advanced_analytics", "priority_support", "api_access", "custom_branding", "bulk_operations", "dedicated_support"] },
  enterprise: { planTier: "enterprise", maxListings: Infinity, maxProducts: Infinity, maxStaff: Infinity, maxLocations: Infinity, maxStorage: Infinity, commissionOverride: 0.05, features: ["advanced_analytics", "priority_support", "api_access", "custom_branding", "bulk_operations", "dedicated_support", "sla_guarantee", "custom_integrations", "white_label"] },
};

export function getPlanQuota(plan: PlanTier): TenantQuota {
  return PLAN_QUOTAS[plan];
}

export function isWithinQuota(tenant: Tenant, resource: "listings" | "products" | "staff" | "locations", currentCount: number): boolean {
  const quota = getPlanQuota(tenant.plan);
  const limits: Record<string, number> = {
    listings: quota.maxListings,
    products: quota.maxProducts,
    staff: quota.maxStaff,
    locations: quota.maxLocations,
  };
  return currentCount < (limits[resource] ?? Infinity);
}

export function hasFeature(plan: PlanTier, feature: string): boolean {
  return PLAN_QUOTAS[plan].features.includes(feature);
}

export function canUpgradeTo(currentPlan: PlanTier, targetPlan: PlanTier): boolean {
  const order: PlanTier[] = ["free", "starter", "growth", "business", "enterprise"];
  return order.indexOf(targetPlan) > order.indexOf(currentPlan);
}

export function getTenantMemberPermissions(role: TenantMember["role"]): string[] {
  const permMap: Record<string, string[]> = {
    owner: ["*"],
    admin: ["members:manage", "settings:manage", "listings:manage", "orders:manage", "analytics:read", "payouts:read"],
    manager: ["listings:manage", "orders:manage", "analytics:read"],
    staff: ["listings:read", "orders:read", "orders:fulfill"],
    viewer: ["listings:read", "orders:read", "analytics:read"],
  };
  return permMap[role] ?? [];
}

export function isTrialExpired(tenant: Tenant): boolean {
  if (!tenant.trialEndsAt) return false;
  return Date.now() > tenant.trialEndsAt;
}

export function emitTenantCreated(tenant: Tenant): void {
  platformBus.emit("tenant:created", {
    tenantId: tenant.tenantId,
    ownerId: tenant.ownerId,
    type: tenant.type,
    plan: tenant.plan,
  }, "multi-tenant");
}

export function emitPlanUpgraded(tenantId: string, oldPlan: PlanTier, newPlan: PlanTier): void {
  platformBus.emit("tenant:plan_upgraded", {
    tenantId, oldPlan, newPlan, timestamp: Date.now(),
  }, "multi-tenant");
}

export function emitMemberInvited(tenantId: string, userId: string, role: string): void {
  platformBus.emit("tenant:member_invited", {
    tenantId, userId, role, timestamp: Date.now(),
  }, "multi-tenant");
  platformBus.emit("notification:created", {
    recipientId: userId,
    type: "tenant_invite",
    title: "Team Invitation",
    body: `You've been invited to join a team as ${role}`,
    route: "/settings/teams",
  }, "multi-tenant");
}

export function emitQuotaWarning(tenantId: string, resource: string, usage: number, limit: number): void {
  platformBus.emit("tenant:quota_warning", {
    tenantId, resource, usage, limit, percentage: (usage / limit) * 100,
    timestamp: Date.now(),
  }, "multi-tenant");
}
