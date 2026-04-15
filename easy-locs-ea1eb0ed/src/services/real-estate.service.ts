import { db } from "./db";
import type {
  Property, PropertyUnit, Building, Lease, Tenant, Landlord,
  MaintenanceTicket, PropertyDocument, PropertyPayment, Viewing,
  Buyer, PropertyStatus, LeaseStatus, TicketStatus, PaymentStatus,
  PortfolioAnalytics,
} from "@/domains/real-estate/canonical-types";
import type { CurrencyCode } from "@/domains/shared/canonical-types";

type Row = Record<string, unknown>;

function s(r: Row, key: string): string { return (r[key] as string) ?? ""; }
function sOpt(r: Row, key: string): string | undefined { return (r[key] as string) ?? undefined; }
function n(r: Row, key: string): number { return (r[key] as number) ?? 0; }
function nOpt(r: Row, key: string): number | undefined { return r[key] != null ? (r[key] as number) : undefined; }
function arr(r: Row, key: string): string[] { return Array.isArray(r[key]) ? (r[key] as string[]) : []; }

function mapLeaseRow(r: Row): Lease {
  return {
    id: s(r, "id"),
    propertyId: s(r, "property_id"),
    unitId: sOpt(r, "unit_id"),
    landlordId: s(r, "landlord_id"),
    tenantId: s(r, "tenant_id"),
    startDate: s(r, "start_date"),
    endDate: s(r, "end_date"),
    rentAmount: n(r, "rent_amount"),
    currency: (r.currency as CurrencyCode) ?? "USD",
    depositAmount: nOpt(r, "deposit_amount"),
    paymentCycle: (r.payment_cycle as Lease["paymentCycle"]) ?? "monthly",
    status: (r.status as LeaseStatus) ?? "draft",
    documentIds: arr(r, "document_ids"),
    createdAt: s(r, "created_at"),
    updatedAt: s(r, "updated_at"),
  };
}

function mapTenantRow(r: Row): Tenant {
  return {
    id: s(r, "id"),
    profileId: s(r, "profile_id"),
    userId: sOpt(r, "user_id"),
    name: s(r, "name"),
    email: sOpt(r, "email"),
    phone: sOpt(r, "phone"),
    leaseIds: arr(r, "lease_ids"),
    paymentStatus: (r.payment_status as PaymentStatus) ?? "pending",
    maintenanceAccess: (r.maintenance_access as boolean) ?? false,
    createdAt: s(r, "created_at"),
  };
}

function mapTicketRow(r: Row): MaintenanceTicket {
  return {
    id: s(r, "id"),
    propertyId: s(r, "property_id"),
    unitId: sOpt(r, "unit_id"),
    reporterId: s(r, "reporter_id"),
    category: s(r, "category"),
    priority: (r.priority as MaintenanceTicket["priority"]) ?? "medium",
    description: s(r, "description"),
    mediaIds: arr(r, "media_ids"),
    assignedProviderId: sOpt(r, "assigned_provider_id"),
    status: (r.status as TicketStatus) ?? "open",
    costEstimate: nOpt(r, "cost_estimate"),
    finalCost: nOpt(r, "final_cost"),
    currency: (r.currency as CurrencyCode) ?? undefined,
    openedAt: s(r, "opened_at"),
    closedAt: sOpt(r, "closed_at"),
    slaDeadline: sOpt(r, "sla_deadline"),
  };
}

function mapDocumentRow(r: Row): PropertyDocument {
  return {
    id: s(r, "id"),
    entityType: (r.entity_type as PropertyDocument["entityType"]) ?? "property",
    entityId: s(r, "entity_id"),
    documentType: (r.document_type as PropertyDocument["documentType"]) ?? "other",
    fileName: s(r, "file_name"),
    fileUrl: s(r, "file_url"),
    expiryDate: sOpt(r, "expiry_date"),
    verificationStatus: (r.verification_status as PropertyDocument["verificationStatus"]) ?? "unverified",
    visibilityRules: {
      ownerVisible: true,
      tenantVisible: false,
      agentVisible: false,
      publicVisible: false,
      ...((r.visibility_rules as Record<string, boolean>) ?? {}),
    },
    createdAt: s(r, "created_at"),
    updatedAt: s(r, "updated_at"),
  };
}

function mapViewingRow(r: Row): Viewing {
  return {
    id: s(r, "id"),
    propertyId: s(r, "property_id"),
    leadId: s(r, "lead_id"),
    agentId: sOpt(r, "assigned_agent_id"),
    dateTime: s(r, "date_time"),
    duration: nOpt(r, "duration"),
    status: (r.status as Viewing["status"]) ?? "requested",
    feedback: sOpt(r, "feedback"),
    rating: nOpt(r, "rating"),
    createdAt: s(r, "created_at"),
  };
}

function mapPaymentRow(r: Row): PropertyPayment {
  return {
    id: s(r, "id"),
    paymentType: (r.payment_type as PropertyPayment["paymentType"]) ?? "rent",
    leaseId: sOpt(r, "lease_id"),
    propertyId: sOpt(r, "property_id"),
    payerId: s(r, "payer_id"),
    receiverId: s(r, "receiver_id"),
    amount: n(r, "amount"),
    currency: (r.currency as CurrencyCode) ?? "USD",
    dueDate: s(r, "due_date"),
    paidAt: sOpt(r, "paid_at"),
    status: (r.status as PaymentStatus) ?? "pending",
    receiptId: sOpt(r, "receipt_id"),
    transactionId: sOpt(r, "transaction_id"),
    reference: sOpt(r, "reference"),
    createdAt: s(r, "created_at"),
  };
}

function mapBuildingRow(r: Row): Building {
  return {
    id: s(r, "id"),
    name: s(r, "name"),
    buildingType: (r.building_type as Building["buildingType"]) ?? "residential",
    address: {
      line1: s(r, "address"),
      city: s(r, "city"),
      district: sOpt(r, "district"),
      country: s(r, "country"),
    },
    managerId: sOpt(r, "manager_id"),
    ownerEntityId: sOpt(r, "owner_entity_id"),
    unitCount: n(r, "unit_count"),
    amenities: arr(r, "amenities"),
    buildingStatus: (r.building_status as Building["buildingStatus"]) ?? "active",
    createdAt: s(r, "created_at"),
    updatedAt: s(r, "updated_at"),
  };
}

function mapPropertyRow(r: Row): Property {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    orgId: (r.org_id as string) ?? undefined,
    propertyType: (r.property_type as Property["propertyType"]) ?? "apartment",
    propertyCategory: (r.property_category as Property["propertyCategory"]) ?? "residential",
    listingType: (r.listing_type as Property["listingType"]) ?? "rent",
    managementType: (r.management_type as Property["managementType"]) ?? "direct_owner",
    title: (r.title as string) ?? "",
    description: (r.description as string) ?? undefined,
    address: {
      line1: (r.address as string) ?? "",
      city: (r.city as string) ?? "",
      district: (r.district as string) ?? undefined,
      zone: (r.zone as string) ?? undefined,
      state: (r.state as string) ?? undefined,
      postalCode: (r.postal_code as string) ?? undefined,
      country: (r.country as string) ?? "",
      geoPoint: r.lat && r.lng ? { lat: r.lat as number, lng: r.lng as number } : undefined,
    },
    price: (r.price as number) ?? 0,
    currency: (r.currency as CurrencyCode) ?? "USD",
    bedrooms: (r.bedrooms as number) ?? undefined,
    bathrooms: (r.bathrooms as number) ?? undefined,
    area: (r.area as number) ?? undefined,
    areaUnit: (r.area_unit as Property["areaUnit"]) ?? "sqm",
    furnishingStatus: (r.furnishing_status as Property["furnishingStatus"]) ?? undefined,
    status: (r.status as PropertyStatus) ?? "draft",
    verificationStatus: (r.verification_status as Property["verificationStatus"]) ?? "unverified",
    mediaIds: Array.isArray(r.media_ids) ? (r.media_ids as string[]) : [],
    amenities: Array.isArray(r.amenities) ? (r.amenities as string[]) : [],
    ownerId: (r.owner_id as string) ?? undefined,
    assignedAgentId: (r.assigned_agent_id as string) ?? undefined,
    assignedManagerId: (r.assigned_manager_id as string) ?? undefined,
    buildingId: (r.building_id as string) ?? undefined,
    qualityScore: (r.quality_score as number) ?? undefined,
    createdAt: (r.created_at as string) ?? "",
    updatedAt: (r.updated_at as string) ?? "",
  };
}

export const realEstatePropertyService = {
  async fetchByUser(userId: string): Promise<Property[]> {
    const { data, error } = await db("properties")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapPropertyRow(r as Row));
  },

  async fetchById(propertyId: string): Promise<Property | null> {
    const { data, error } = await db("properties")
      .select("*")
      .eq("id", propertyId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPropertyRow(data as Row) : null;
  },

  async fetchByOrg(orgId: string): Promise<Property[]> {
    const { data, error } = await db("properties")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapPropertyRow(r as Row));
  },

  async fetchPublished(filters?: {
    listingType?: string;
    propertyType?: string;
    country?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    furnished?: boolean;
  }): Promise<Property[]> {
    let query = db("properties").select("*").eq("status", "published");
    if (filters?.listingType) query = query.eq("listing_type", filters.listingType);
    if (filters?.propertyType) query = query.eq("property_type", filters.propertyType);
    if (filters?.country) query = query.ilike("country", filters.country);
    if (filters?.city) query = query.ilike("city", `%${filters.city}%`);
    if (filters?.minPrice) query = query.gte("price", filters.minPrice);
    if (filters?.maxPrice) query = query.lte("price", filters.maxPrice);
    if (filters?.minBedrooms) query = query.gte("bedrooms", filters.minBedrooms);
    if (filters?.furnished) query = query.eq("furnishing_status", "furnished");
    query = query.order("created_at", { ascending: false }).limit(50);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(r => mapPropertyRow(r as Row));
  },

  async create(property: Omit<Property, "id" | "createdAt" | "updatedAt">): Promise<Property | null> {
    const { data, error } = await db("properties")
      .insert({
        user_id: property.userId,
        org_id: property.orgId,
        property_type: property.propertyType,
        property_category: property.propertyCategory,
        listing_type: property.listingType,
        management_type: property.managementType,
        title: property.title,
        description: property.description,
        address: property.address.line1,
        city: property.address.city,
        district: property.address.district,
        country: property.address.country,
        price: property.price,
        currency: property.currency,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        area_unit: property.areaUnit,
        furnishing_status: property.furnishingStatus,
        status: property.status,
        media_ids: property.mediaIds,
        amenities: property.amenities,
        owner_id: property.ownerId,
        assigned_agent_id: property.assignedAgentId,
      })
      .select()
      .single();
    if (error) throw error;
    return data ? mapPropertyRow(data as Row) : null;
  },

  async updateStatus(propertyId: string, userId: string, status: PropertyStatus) {
    const { error } = await db("properties")
      .update({ status })
      .eq("id", propertyId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async update(propertyId: string, userId: string, updates: Record<string, unknown>) {
    const { error } = await db("properties")
      .update(updates)
      .eq("id", propertyId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async countByUser(userId: string): Promise<number> {
    const { count, error } = await db("properties")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw error;
    return count ?? 0;
  },
};

export const realEstateLeaseService = {
  async fetchByProperty(propertyId: string): Promise<Lease[]> {
    const { data, error } = await db("leases")
      .select("*")
      .eq("property_id", propertyId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapLeaseRow(r as Row));
  },

  async fetchByTenant(tenantId: string): Promise<Lease[]> {
    const { data, error } = await db("leases")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapLeaseRow(r as Row));
  },

  async fetchById(leaseId: string): Promise<Lease | null> {
    const { data, error } = await db("leases")
      .select("*")
      .eq("id", leaseId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapLeaseRow(data as Row) : null;
  },

  async fetchActive(userId: string): Promise<Lease[]> {
    const { data, error } = await db("leases")
      .select("*, properties!inner(user_id)")
      .eq("properties.user_id", userId)
      .eq("status", "active")
      .order("end_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapLeaseRow(r as Row));
  },

  async updateStatus(leaseId: string, status: LeaseStatus) {
    const { error } = await db("leases")
      .update({ status })
      .eq("id", leaseId);
    if (error) throw error;
  },
};

export const realEstateTenantService = {
  async fetchByProperty(propertyId: string): Promise<Tenant[]> {
    const { data, error } = await db("tenants")
      .select("*")
      .eq("property_id", propertyId);
    if (error) throw error;
    return (data ?? []).map(r => mapTenantRow(r as Row));
  },

  async fetchById(tenantId: string): Promise<Tenant | null> {
    const { data, error } = await db("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapTenantRow(data as Row) : null;
  },

  async fetchByUser(userId: string): Promise<Tenant[]> {
    const { data, error } = await db("tenants")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map(r => mapTenantRow(r as Row));
  },
};

export const realEstateMaintenanceService = {
  async fetchByProperty(propertyId: string): Promise<MaintenanceTicket[]> {
    const { data, error } = await db("maintenance_tickets")
      .select("*")
      .eq("property_id", propertyId)
      .order("opened_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapTicketRow(r as Row));
  },

  async fetchByUser(userId: string): Promise<MaintenanceTicket[]> {
    const { data, error } = await db("maintenance_tickets")
      .select("*")
      .eq("reporter_id", userId)
      .order("opened_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapTicketRow(r as Row));
  },

  async updateStatus(ticketId: string, status: TicketStatus) {
    const { error } = await db("maintenance_tickets")
      .update({ status })
      .eq("id", ticketId);
    if (error) throw error;
  },

  async create(ticket: Omit<MaintenanceTicket, "id" | "openedAt">) {
    const { data, error } = await db("maintenance_tickets")
      .insert({
        property_id: ticket.propertyId,
        unit_id: ticket.unitId,
        reporter_id: ticket.reporterId,
        category: ticket.category,
        priority: ticket.priority,
        description: ticket.description,
        media_ids: ticket.mediaIds,
        status: "open",
      })
      .select()
      .single();
    if (error) throw error;

    if (data?.id) {
      const { data: property } = await db("properties")
        .select("user_id, title")
        .eq("id", ticket.propertyId)
        .maybeSingle();
      if (property?.user_id) {
        const { dispatchMultiChannel } = await import("@/lib/notifications/notification-dispatcher");
        dispatchMultiChannel({
          userId: property.user_id,
          eventType: "maintenance_request",
          title: "Maintenance Request",
          body: `${property.title ?? "Property"}: ${ticket.description}`,
          channels: ["in_app", "push"],
          priority: ticket.priority === "urgent" ? "high" : "normal",
          entityId: data.id,
          entityType: "maintenance_ticket",
          dedupeKey: `maintenance_${data.id}`,
          data: { domain: "real_estate", property_name: property.title ?? "Property" },
        }).catch(() => {});
      }
    }

    return data;
  },
};

export const realEstateDocumentService = {
  async fetchByEntity(entityType: string, entityId: string): Promise<PropertyDocument[]> {
    const { data, error } = await db("property_documents")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapDocumentRow(r as Row));
  },

  async fetchExpiring(userId: string, daysAhead: number = 30): Promise<PropertyDocument[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const { data, error } = await db("property_documents")
      .select("*, properties!inner(user_id)")
      .eq("properties.user_id", userId)
      .lte("expiry_date", futureDate.toISOString())
      .order("expiry_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapDocumentRow(r as Row));
  },
};

export const realEstateViewingService = {
  async fetchByProperty(propertyId: string): Promise<Viewing[]> {
    const { data, error } = await db("viewings")
      .select("*")
      .eq("property_id", propertyId)
      .order("date_time", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapViewingRow(r as Row));
  },

  async fetchUpcoming(agentId: string): Promise<Viewing[]> {
    const { data, error } = await db("viewings")
      .select("*")
      .eq("assigned_agent_id", agentId)
      .in("status", ["requested", "confirmed"])
      .order("date_time", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapViewingRow(r as Row));
  },

  async create(viewing: Omit<Viewing, "id" | "createdAt">) {
    const { data, error } = await db("viewings")
      .insert({
        property_id: viewing.propertyId,
        lead_id: viewing.leadId,
        assigned_agent_id: viewing.agentId,
        date_time: viewing.dateTime,
        status: "requested",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export const realEstatePaymentService = {
  async fetchByLease(leaseId: string): Promise<PropertyPayment[]> {
    const { data, error } = await db("property_payments")
      .select("*")
      .eq("lease_id", leaseId)
      .order("due_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapPaymentRow(r as Row));
  },

  async fetchByUser(userId: string): Promise<PropertyPayment[]> {
    const { data, error } = await db("property_payments")
      .select("*")
      .or(`payer_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("due_date", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map(r => mapPaymentRow(r as Row));
  },

  async fetchOverdue(userId: string): Promise<PropertyPayment[]> {
    const { data, error } = await db("property_payments")
      .select("*")
      .eq("receiver_id", userId)
      .eq("status", "overdue")
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapPaymentRow(r as Row));
  },

  async fetchByType(userId: string, paymentType: string): Promise<PropertyPayment[]> {
    const { data, error } = await db("property_payments")
      .select("*")
      .or(`payer_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("payment_type", paymentType)
      .order("due_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapPaymentRow(r as Row));
  },
};

export const realEstateBuildingService = {
  async fetchByManager(managerId: string): Promise<Building[]> {
    const { data, error } = await db("buildings")
      .select("*")
      .eq("manager_id", managerId)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapBuildingRow(r as Row));
  },

  async fetchById(buildingId: string): Promise<Building | null> {
    const { data, error } = await db("buildings")
      .select("*")
      .eq("id", buildingId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapBuildingRow(data as Row) : null;
  },
};

export const realEstateAnalyticsService = {
  async getPortfolioOverview(userId: string): Promise<PortfolioAnalytics> {
    const propsRes = await db("properties").select("id", { count: "exact" }).eq("user_id", userId);
    const propertyIds = (propsRes.data ?? []).map((p: Record<string, unknown>) => p.id as string);
    const totalProperties = propertyIds.length;

    let activeLeases = 0;
    let openTickets = 0;
    let monthlyRevenue = 0;

    if (propertyIds.length > 0) {
      const [leasesRes, ticketsRes] = await Promise.all([
        db("leases").select("id, status, rent_amount, currency")
          .eq("status", "active")
          .in("property_id", propertyIds),
        db("maintenance_tickets").select("id", { count: "exact" })
          .in("status", ["open", "assigned", "in_progress"])
          .in("property_id", propertyIds),
      ]);

      activeLeases = (leasesRes.data ?? []).length;
      openTickets = ticketsRes.count ?? 0;
      monthlyRevenue = (leasesRes.data ?? []).reduce((sum: number, l: Record<string, unknown>) => sum + (Number(l.rent_amount) || 0), 0);
    }

    return {
      totalProperties,
      totalUnits: 0,
      activeLeases,
      vacantUnits: Math.max(0, totalProperties - activeLeases),
      openTickets,
      occupancyRate: totalProperties > 0 ? Math.round((activeLeases / totalProperties) * 100) : 0,
      rentCollectionRate: 0,
      monthlyRevenue,
      currency: "USD" as CurrencyCode,
      qualityScore: 0,
    };
  },
};
