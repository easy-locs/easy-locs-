import { platformBus } from "@/lib/shared/platform-bus";

export type AdminRole = "super_admin" | "admin" | "support_lead" | "support_agent" | "finance" | "compliance_officer" | "content_moderator";

export interface AdminUser {
  adminId: string;
  userId: string;
  role: AdminRole;
  permissions: string[];
  lastLoginAt: string | null;
  twoFactorEnabled: boolean;
  ipWhitelist: string[];
}

export interface AuditLogEntry {
  entryId: string;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  assignedTo: string | null;
  category: "order" | "payment" | "account" | "listing" | "delivery" | "technical" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting_user" | "escalated" | "resolved" | "closed";
  subject: string;
  messages: Array<{ senderId: string; body: string; timestamp: number; isInternal: boolean }>;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  slaDeadline: number | null;
  tags: string[];
}

export interface PlatformMetrics {
  totalUsers: number;
  activeUsersDaily: number;
  activeUsersMonthly: number;
  totalSellers: number;
  activeSellers: number;
  totalListings: number;
  activeListings: number;
  transactionsToday: number;
  revenueToday: number;
  openTickets: number;
  avgResponseTimeMinutes: number;
  pendingKYC: number;
  pendingModeration: number;
  currency: string;
}

const ADMIN_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: ["*"],
  admin: ["users:read", "users:write", "users:delete", "listings:manage", "transactions:read", "transactions:refund", "support:manage", "moderation:manage", "compliance:read", "analytics:read", "settings:manage"],
  support_lead: ["users:read", "support:manage", "support:assign", "support:escalate", "transactions:read", "transactions:refund", "listings:read"],
  support_agent: ["users:read", "support:read", "support:respond", "transactions:read", "listings:read"],
  finance: ["transactions:read", "transactions:refund", "analytics:read", "payouts:manage", "compliance:read"],
  compliance_officer: ["users:read", "compliance:manage", "compliance:approve", "compliance:reject", "transactions:read", "aml:manage"],
  content_moderator: ["listings:read", "listings:moderate", "reviews:moderate", "users:read", "moderation:manage"],
};

export function getAdminPermissions(role: AdminRole): string[] {
  return ADMIN_PERMISSIONS[role] ?? [];
}

export function hasAdminPermission(role: AdminRole, permission: string): boolean {
  const perms = getAdminPermissions(role);
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

export function canEscalateTicket(role: AdminRole): boolean {
  return ["super_admin", "admin", "support_lead"].includes(role);
}

export function calculateSLADeadline(priority: SupportTicket["priority"]): number {
  const slaHours: Record<string, number> = { urgent: 1, high: 4, medium: 12, low: 24 };
  return Date.now() + (slaHours[priority] ?? 24) * 3600000;
}

export function isTicketSLABreached(ticket: SupportTicket): boolean {
  if (!ticket.slaDeadline) return false;
  if (ticket.status === "resolved" || ticket.status === "closed") return false;
  return Date.now() > ticket.slaDeadline;
}

export function createAuditLog(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes: Record<string, { old: unknown; new: unknown }>
): AuditLogEntry {
  const entry: AuditLogEntry = {
    entryId: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    adminId, action, resourceType, resourceId, changes,
    ipAddress: "0.0.0.0",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server",
    timestamp: Date.now(),
  };
  platformBus.emit("admin:audit_logged", entry, "admin-system");
  return entry;
}

export function emitTicketCreated(ticket: SupportTicket): void {
  platformBus.emit("support:ticket_created", {
    ticketId: ticket.ticketId,
    userId: ticket.userId,
    category: ticket.category,
    priority: ticket.priority,
  }, "admin-system");
}

export function emitTicketEscalated(ticketId: string, fromAgent: string, toAgent: string): void {
  platformBus.emit("support:ticket_escalated", {
    ticketId, fromAgent, toAgent, timestamp: Date.now(),
  }, "admin-system");
}

export function emitUserAction(adminId: string, action: string, targetUserId: string): void {
  platformBus.emit("admin:user_action", {
    adminId, action, targetUserId, timestamp: Date.now(),
  }, "admin-system");
}
