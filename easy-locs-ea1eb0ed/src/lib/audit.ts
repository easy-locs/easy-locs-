/**
 * Centralized Audit Logger
 * 
 * Provides a simple, fire-and-forget API for recording audit events.
 * All entries go to the `audit_logs` table with structured metadata.
 */

import { db } from "@/services/db";

export type AuditAction =
  // Auth
  | "user_login" | "user_logout"
  // Properties
  | "property_created" | "property_updated" | "property_deleted"
  // Tenants
  | "tenant_created" | "tenant_updated" | "tenant_deleted"
  // Leases
  | "lease_created" | "lease_updated" | "lease_terminated"
  // Financial
  | "expense_created" | "expense_deleted"
  | "payment_marked_paid" | "payment_notice_sent"
  | "rent_call_created"
  // Documents
  | "document_created" | "document_signed" | "document_emailed"
  // Interventions
  | "intervention_created" | "intervention_status_changed" | "intervention_completed"
  // Bookings
  | "booking_confirmed" | "booking_cancelled" | "booking_refunded"
  | "booking_payment_confirmed"
  // Marketplace
  | "service_created" | "service_updated" | "service_deleted"
  // Listings
  | "listing_published" | "listing_unpublished"
  // Team
  | "member_invited" | "member_removed" | "member_role_changed"
  // Communication
  | "message_sent"
  // Monitoring
  | "monitoring:error" | "monitoring:sync_failure";

interface AuditOptions {
  userId?: string;
  orgId?: string | null;
  action: AuditAction | string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event. Fire-and-forget — never throws.
 */
export async function logAudit({ userId, orgId, action, metadata }: AuditOptions): Promise<void> {
  try {
    // If no userId provided, try to get from session
    let uid = userId;
    if (!uid) {
      const { data: { session } } = await db.auth.getSession();
      uid = session?.user?.id;
    }
    if (!uid) return; // Can't log without a user

    await db("audit_logs").insert({
      user_id: uid,
      org_id: orgId || null,
      action,
      metadata_json: (metadata || {}) as any,
    });
  } catch {
    // Silent fail — audit logging should never break the app
  }
}

/**
 * Convenience wrapper: log with current auth context automatically.
 * Usage: auditLog("property_created", { property_id: "..." })
 */
export function createAuditLogger(orgId: string | null, userId?: string) {
  return (action: AuditAction | string, metadata?: Record<string, unknown>) =>
    logAudit({ userId, orgId, action, metadata });
}
