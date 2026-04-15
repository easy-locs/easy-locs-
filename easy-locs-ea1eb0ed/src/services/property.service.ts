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

const PROPERTY_LIST_COLS = "id, user_id, org_id, title, address, city, country, property_type, status, created_at";

export const propertyService = {
  async fetchByUser(userId: string, opts?: { limit?: number; offset?: number }) {
    const limit = opts?.limit ?? 30;
    let q = db("properties")
      .select(PROPERTY_LIST_COLS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opts?.offset) q = q.range(opts.offset, opts.offset + limit - 1);
    const { data, error } = await q as { data: PropertyRow[] | null; error: unknown };
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

  async fetchByOrg(orgId: string, opts?: { limit?: number; offset?: number }) {
    const limit = opts?.limit ?? 30;
    let q = db("properties")
      .select(PROPERTY_LIST_COLS)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opts?.offset) q = q.range(opts.offset, opts.offset + limit - 1);
    const { data, error } = await q as { data: PropertyRow[] | null; error: unknown };
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
      .select("id, property_id, tenant_id, start_date, end_date, rent_amount, currency, status, created_at")
      .eq("property_id", propertyId)
      .order("start_date", { ascending: false }) as { data: LeaseRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchByOrg(orgId: string) {
    const { data, error } = await db("leases")
      .select("id, property_id, tenant_id, start_date, end_date, rent_amount, currency, status, created_at, properties!inner(org_id)")
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
      .select("id, user_id, name, email, phone, property_id, status")
      .eq("property_id", propertyId) as { data: TenantRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchByUser(userId: string) {
    const { data, error } = await db("tenants")
      .select("id, user_id, name, email, phone, property_id, status")
      .eq("user_id", userId) as { data: TenantRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchByTenantUserId(userId: string) {
    const { data, error } = await db("tenants")
      .select("id, user_id, name, email, phone, property_id, status, tenant_user_id, properties(id, title, address, city)")
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
      .select("id, user_id, name, email, phone, property_id, status, tenant_user_id, properties(id, title, address, city, country)")
      .eq("tenant_user_id", userId) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    if (!tenants || tenants.length === 0) return null;
    const tenant = tenants[0] as any;

    const [rentRes, leaseRes, docRes] = await Promise.all([
      db("rent_calls").select("id, tenant_id, month, rent_amount, charges_amount, total_amount, paid, paid_date, payment_method").eq("tenant_id", tenant.id).order("month", { ascending: false }).limit(24),
      db("leases").select("id, property_id, tenant_id, start_date, end_date, rent_amount, currency, status").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(5),
      db("documents").select("id, property_id, doc_type, file_url, file_name, created_at").eq("property_id", tenant.property_id).in("doc_type", ["quittance", "rent-receipt", "lease", "bail"]).order("created_at", { ascending: false }).limit(20),
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
      .select("id, property_id, tenant_id, start_date, end_date, rent_amount, currency, status, tenants(name, email, phone), properties(label, address, city)")
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
      .select("id, property_id, org_id, doc_type, file_url, file_name, created_at")
      .eq("property_id", propertyId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },
};
