import { db } from "./db";


export interface PropertyRow {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  address: string | null;
  city: string | null;
  country: string | null;
  property_type: string | null;
  status: string;
  created_at: string;
}

export interface LeaseRow {
  id: string;
  property_id: string;
  tenant_id: string | null;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  currency: string;
  status: string;
}

export interface TenantRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  property_id: string | null;
  status: string;
}

export const propertyService = {
  async fetchByUser(userId: string) {
    const { data, error } = await db("properties")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as { data: PropertyRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchById(propertyId: string) {
    const { data, error } = await db("properties")
      .select("*")
      .eq("id", propertyId)
      .maybeSingle() as { data: PropertyRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchByOrg(orgId: string) {
    const { data, error } = await db("properties")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }) as { data: PropertyRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async countByUser(userId: string) {
    const { count, error } = await db("properties")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId) as { count: number | null; error: unknown };
    if (error) throw error;
    return count ?? 0;
  },

  async update(propertyId: string, userId: string, updates: Partial<PropertyRow>) {
    const { error } = await db("properties")
      .update(updates)
      .eq("id", propertyId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async insert(row: Omit<PropertyRow, "id" | "created_at">) {
    const { data, error } = await db("properties")
      .insert(row)
      .select()
      .single() as { data: PropertyRow | null; error: unknown };
    if (error) throw error;
    return data;
  },
};

export const leaseService = {
  async fetchByProperty(propertyId: string) {
    const { data, error } = await db("leases")
      .select("*")
      .eq("property_id", propertyId)
      .order("start_date", { ascending: false }) as { data: LeaseRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchByOrg(orgId: string) {
    const { data, error } = await db("leases")
      .select("*, properties!inner(org_id)")
      .eq("properties.org_id", orgId)
      .order("start_date", { ascending: false }) as { data: LeaseRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchById(leaseId: string) {
    const { data, error } = await db("leases")
      .select("*")
      .eq("id", leaseId)
      .maybeSingle() as { data: LeaseRow | null; error: unknown };
    if (error) throw error;
    return data;
  },
};

export const tenantService = {
  async fetchByProperty(propertyId: string) {
    const { data, error } = await db("tenants")
      .select("*")
      .eq("property_id", propertyId) as { data: TenantRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchByUser(userId: string) {
    const { data, error } = await db("tenants")
      .select("*")
      .eq("user_id", userId) as { data: TenantRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchByTenantUserId(userId: string) {
    const { data, error } = await db("tenants")
      .select("*, properties(*)")
      .eq("tenant_user_id", userId) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchById(tenantId: string) {
    const { data, error } = await db("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle() as { data: TenantRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchFullTenantView(userId: string) {
    const { data: tenants, error } = await db("tenants")
      .select("*, properties(*)")
      .eq("tenant_user_id", userId) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    if (!tenants || tenants.length === 0) return null;
    const tenant = tenants[0] as any;

    const [rentRes, leaseRes, docRes] = await Promise.all([
      db("rent_calls").select("*").eq("tenant_id", tenant.id).order("month", { ascending: false }),
      db("leases").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
      db("documents").select("*").eq("property_id", tenant.property_id).in("doc_type", ["quittance", "rent-receipt", "lease", "bail"]).order("created_at", { ascending: false }),
    ]);
    if (rentRes.error) throw rentRes.error;
    if (leaseRes.error) throw leaseRes.error;
    if (docRes.error) throw docRes.error;
    return {
      tenant,
      property: tenant.properties,
      rentCalls: (rentRes.data ?? []) as any[],
      leases: (leaseRes.data ?? []) as any[],
      documents: (docRes.data ?? []) as any[],
    };
  },
};

export const leaseServiceExtended = {
  async fetchByPropertyAndOrg(propertyId: string, orgId: string) {
    const { data, error } = await db("leases")
      .select("*, tenants(name, email, phone), properties(label, address, city)")
      .eq("property_id", propertyId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },
};

export const documentService = {
  async fetchByPropertyAndOrg(propertyId: string, orgId: string) {
    const { data, error } = await db("documents")
      .select("*")
      .eq("property_id", propertyId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },
};
