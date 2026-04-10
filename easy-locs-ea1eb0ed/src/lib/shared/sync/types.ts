/**
 * Sync Engine — Event context types.
 */
export interface SyncContext {
  orgId: string;
  propertyId?: string;
  tenantId?: string;
  leaseId?: string;
  bookingId?: string;
  leadId?: string;
  documentId?: string;
  paymentRequestId?: string;
  countryCode?: string;
}
