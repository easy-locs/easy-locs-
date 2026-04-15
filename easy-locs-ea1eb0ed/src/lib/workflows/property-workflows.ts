import type { WorkflowDefinition } from "./workflow-engine";
import { realEstatePropertyService } from "@/services/real-estate.service";
import { getPublishBlockers } from "@/domains/real-estate/quality-gates";
import { platformBus } from "@/lib/shared/platform-bus";

interface CreatePropertyCtx extends Record<string, unknown> {
  userId: string;
  propertyData: Record<string, unknown>;
  propertyId?: string;
  qualityScore?: number;
}

export const createPropertyWorkflow: WorkflowDefinition<CreatePropertyCtx> = {
  name: "property.create",
  maxDurationMs: 30000,
  steps: [
    {
      id: "validate_input",
      name: "Validate property data",
      execute: async (ctx) => {
        const d = ctx.propertyData;
        if (!d.title || !d.propertyType || !d.listingType) {
          throw new Error("Missing required fields: title, propertyType, listingType");
        }
        if (!d.country || !d.city) {
          throw new Error("Missing required location: country, city");
        }
        return ctx;
      },
    },
    {
      id: "create_record",
      name: "Create property in database",
      canRetry: true,
      maxRetries: 2,
      execute: async (ctx) => {
        const result = await realEstatePropertyService.create({
          userId: ctx.userId,
          propertyType: ctx.propertyData.propertyType as any,
          propertyCategory: (ctx.propertyData.propertyCategory as any) ?? "residential",
          listingType: (ctx.propertyData.listingType as any) ?? "rent",
          managementType: "direct_owner",
          title: ctx.propertyData.title as string,
          description: ctx.propertyData.description as string | undefined,
          address: {
            line1: (ctx.propertyData.address as string) ?? "",
            city: ctx.propertyData.city as string,
            district: ctx.propertyData.district as string | undefined,
            country: ctx.propertyData.country as string,
          },
          price: (ctx.propertyData.price as number) ?? 0,
          currency: (ctx.propertyData.currency as any) ?? "USD",
          bedrooms: ctx.propertyData.bedrooms as number | undefined,
          bathrooms: ctx.propertyData.bathrooms as number | undefined,
          area: ctx.propertyData.area as number | undefined,
          areaUnit: (ctx.propertyData.areaUnit as any) ?? "sqm",
          furnishingStatus: ctx.propertyData.furnishingStatus as any,
          status: "draft",
          verificationStatus: "unverified",
          mediaIds: [],
          amenities: [],
        });
        if (!result) throw new Error("Property creation returned null");
        ctx.propertyId = result.id;
        return ctx;
      },
      rollback: async (ctx) => {
        if (ctx.propertyId) {
          await realEstatePropertyService.updateStatus(ctx.propertyId, ctx.userId, "archived");
        }
      },
    },
    {
      id: "compute_quality",
      name: "Compute quality score",
      execute: async (ctx) => {
        if (ctx.propertyId) {
          const property = await realEstatePropertyService.fetchById(ctx.propertyId);
          if (property) {
            const blockers = getPublishBlockers(property);
            ctx.qualityScore = blockers.length === 0 ? 100 : Math.max(0, 100 - blockers.length * 15);
          }
        }
        return ctx;
      },
    },
    {
      id: "emit_event",
      name: "Emit creation event",
      execute: async (ctx) => {
        platformBus.emit("property:unit_created", {
          propertyId: ctx.propertyId,
          userId: ctx.userId,
          qualityScore: ctx.qualityScore,
        }, "pm");
        return ctx;
      },
    },
  ],
};

interface PublishPropertyCtx extends Record<string, unknown> {
  userId: string;
  propertyId: string;
  canPublish?: boolean;
  blockers?: string[];
}

export const publishPropertyWorkflow: WorkflowDefinition<PublishPropertyCtx> = {
  name: "property.publish",
  maxDurationMs: 15000,
  steps: [
    {
      id: "check_quality",
      name: "Run quality gates",
      execute: async (ctx) => {
        const property = await realEstatePropertyService.fetchById(ctx.propertyId);
        if (!property) throw new Error("Property not found");
        if (property.userId !== ctx.userId) throw new Error("Unauthorized");
        const blockers = getPublishBlockers(property);
        ctx.canPublish = blockers.length === 0;
        ctx.blockers = blockers;
        return ctx;
      },
    },
    {
      id: "publish",
      name: "Set status to published",
      condition: (ctx) => ctx.canPublish === true,
      canRetry: true,
      execute: async (ctx) => {
        await realEstatePropertyService.updateStatus(ctx.propertyId, ctx.userId, "published");
        return ctx;
      },
    },
    {
      id: "notify",
      name: "Emit publication event",
      condition: (ctx) => ctx.canPublish === true,
      execute: async (ctx) => {
        platformBus.emit("property:published_to_marketplace", {
          propertyId: ctx.propertyId,
          userId: ctx.userId,
        }, "pm");
        return ctx;
      },
    },
  ],
};

interface ViewingCtx extends Record<string, unknown> {
  propertyId: string;
  leadId: string;
  agentId?: string;
  dateTime: string;
  viewingId?: string;
}

export const viewingWorkflow: WorkflowDefinition<ViewingCtx> = {
  name: "property.viewing",
  maxDurationMs: 15000,
  steps: [
    {
      id: "validate",
      name: "Validate viewing request",
      execute: async (ctx) => {
        if (!ctx.propertyId || !ctx.leadId || !ctx.dateTime) {
          throw new Error("Missing required: propertyId, leadId, dateTime");
        }
        const requestDate = new Date(ctx.dateTime);
        if (requestDate < new Date()) throw new Error("Viewing date must be in the future");
        return ctx;
      },
    },
    {
      id: "create_viewing",
      name: "Create viewing record",
      canRetry: true,
      execute: async (ctx) => {
        const { realEstateViewingService } = await import("@/services/real-estate.service");
        const result = await realEstateViewingService.create({
          propertyId: ctx.propertyId,
          leadId: ctx.leadId,
          agentId: ctx.agentId,
          dateTime: ctx.dateTime,
          status: "requested",
          createdAt: new Date().toISOString(),
        });
        ctx.viewingId = (result as Record<string, unknown>)?.id as string;
        return ctx;
      },
    },
    {
      id: "notify_parties",
      name: "Notify agent and lead",
      execute: async (ctx) => {
        platformBus.emit("marketplace:booking_created", {
          viewingId: ctx.viewingId,
          propertyId: ctx.propertyId,
          leadId: ctx.leadId,
          agentId: ctx.agentId,
          dateTime: ctx.dateTime,
        }, "marketplace");
        return ctx;
      },
    },
  ],
};

interface MaintenanceCtx extends Record<string, unknown> {
  propertyId: string;
  reporterId: string;
  category: string;
  priority: string;
  description: string;
  ticketId?: string;
}

export const maintenanceWorkflow: WorkflowDefinition<MaintenanceCtx> = {
  name: "property.maintenance",
  maxDurationMs: 20000,
  steps: [
    {
      id: "validate",
      name: "Validate ticket data",
      execute: async (ctx) => {
        if (!ctx.propertyId || !ctx.description) {
          throw new Error("Missing required: propertyId, description");
        }
        return ctx;
      },
    },
    {
      id: "create_ticket",
      name: "Create maintenance ticket",
      canRetry: true,
      execute: async (ctx) => {
        const { realEstateMaintenanceService } = await import("@/services/real-estate.service");
        const result = await realEstateMaintenanceService.create({
          propertyId: ctx.propertyId,
          reporterId: ctx.reporterId,
          category: ctx.category || "general",
          priority: (ctx.priority as any) ?? "medium",
          description: ctx.description,
          mediaIds: [],
          status: "open",
        });
        ctx.ticketId = (result as Record<string, unknown>)?.id as string;
        return ctx;
      },
    },
    {
      id: "notify",
      name: "Emit maintenance event",
      execute: async (ctx) => {
        platformBus.emit("pm:intervention_created", {
          ticketId: ctx.ticketId,
          propertyId: ctx.propertyId,
          priority: ctx.priority,
        }, "pm");
        return ctx;
      },
    },
  ],
};

interface LeaseCtx extends Record<string, unknown> {
  propertyId: string;
  tenantId: string;
  landlordId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: string;
  leaseId?: string;
}

export const leaseWorkflow: WorkflowDefinition<LeaseCtx> = {
  name: "property.lease",
  maxDurationMs: 30000,
  steps: [
    {
      id: "validate",
      name: "Validate lease terms",
      execute: async (ctx) => {
        if (!ctx.propertyId || !ctx.tenantId || !ctx.landlordId) {
          throw new Error("Missing required parties");
        }
        const start = new Date(ctx.startDate);
        const end = new Date(ctx.endDate);
        if (end <= start) throw new Error("End date must be after start date");
        if (ctx.rentAmount <= 0) throw new Error("Rent amount must be positive");
        return ctx;
      },
    },
    {
      id: "check_availability",
      name: "Verify property is available",
      execute: async (ctx) => {
        const property = await realEstatePropertyService.fetchById(ctx.propertyId);
        if (!property) throw new Error("Property not found");
        if (property.status === "rented") throw new Error("Property already rented");
        return ctx;
      },
    },
    {
      id: "create_lease",
      name: "Create lease record",
      canRetry: true,
      execute: async (ctx) => {
        platformBus.emit("pm:lease_created", {
          propertyId: ctx.propertyId,
          tenantId: ctx.tenantId,
          startDate: ctx.startDate,
          rentAmount: ctx.rentAmount,
        }, "pm");
        return ctx;
      },
    },
    {
      id: "update_property_status",
      name: "Mark property as rented",
      execute: async (ctx) => {
        const property = await realEstatePropertyService.fetchById(ctx.propertyId);
        if (property) {
          await realEstatePropertyService.updateStatus(ctx.propertyId, property.userId, "rented");
        }
        return ctx;
      },
    },
  ],
};

interface RentPaymentCtx extends Record<string, unknown> {
  leaseId: string;
  amount: number;
  currency: string;
  payerId: string;
  receiverId: string;
  dueDate: string;
  paymentId?: string;
}

export const rentPaymentWorkflow: WorkflowDefinition<RentPaymentCtx> = {
  name: "property.rent_payment",
  maxDurationMs: 20000,
  steps: [
    {
      id: "validate",
      name: "Validate payment",
      execute: async (ctx) => {
        if (ctx.amount <= 0) throw new Error("Payment amount must be positive");
        if (!ctx.leaseId) throw new Error("Lease ID required");
        return ctx;
      },
    },
    {
      id: "process_payment",
      name: "Process rent payment",
      canRetry: true,
      maxRetries: 3,
      execute: async (ctx) => {
        platformBus.emit("pm:rent_call_created", {
          leaseId: ctx.leaseId,
          amount: ctx.amount,
          currency: ctx.currency,
        }, "pm");
        return ctx;
      },
    },
    {
      id: "confirm",
      name: "Confirm payment",
      execute: async (ctx) => {
        platformBus.emit("pm:payment_received", {
          paymentId: ctx.paymentId,
          leaseId: ctx.leaseId,
          amount: ctx.amount,
        }, "pm");
        return ctx;
      },
    },
  ],
};

interface DocumentComplianceCtx extends Record<string, unknown> {
  userId: string;
  daysAhead: number;
  expiringCount?: number;
}

export const documentComplianceWorkflow: WorkflowDefinition<DocumentComplianceCtx> = {
  name: "property.document_compliance",
  maxDurationMs: 15000,
  steps: [
    {
      id: "scan_expiring",
      name: "Scan for expiring documents",
      execute: async (ctx) => {
        const { realEstateDocumentService } = await import("@/services/real-estate.service");
        const expiring = await realEstateDocumentService.fetchExpiring(ctx.userId, ctx.daysAhead || 30);
        ctx.expiringCount = expiring.length;
        return ctx;
      },
    },
    {
      id: "alert",
      name: "Emit compliance alerts and notify owner",
      condition: (ctx) => (ctx.expiringCount ?? 0) > 0,
      execute: async (ctx) => {
        platformBus.emit("pm:document_shared", {
          userId: ctx.userId,
          count: ctx.expiringCount,
        }, "pm");

        try {
          const { sendInAppNotification } = await import("@/lib/notifications/notification-dispatcher");
          await sendInAppNotification({
            userId: ctx.userId,
            type: "document_expiry",
            title: "Documents expiring soon",
            body: `${ctx.expiringCount} document${ctx.expiringCount === 1 ? "" : "s"} will expire within ${ctx.daysAhead || 30} days. Review and renew to stay compliant.`,
            deepLink: "/dashboard/documents",
            domain: "real_estate",
            actor: "system",
            priority: ctx.expiringCount >= 3 ? "high" : "normal",
            dedupKey: `doc_expiry_${ctx.userId}_${new Date().toISOString().slice(0, 10)}`,
            data: { expiringCount: ctx.expiringCount, daysAhead: ctx.daysAhead || 30 },
          });
        } catch (err) {
          console.error("[DocumentCompliance] Failed to send expiry notification", err);
        }

        return ctx;
      },
    },
  ],
};

export const PROPERTY_WORKFLOWS = {
  create: createPropertyWorkflow,
  publish: publishPropertyWorkflow,
  viewing: viewingWorkflow,
  maintenance: maintenanceWorkflow,
  lease: leaseWorkflow,
  rentPayment: rentPaymentWorkflow,
  documentCompliance: documentComplianceWorkflow,
} as const;
