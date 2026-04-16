import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";

export function useWarehouses(orgId: string) {
  return useQuery({
    queryKey: ["delivery-warehouses", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_warehouses")
        .select("*")
        .eq("shop_id", orgId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useWarehouseStock(orgId: string) {
  return useQuery({
    queryKey: ["delivery-warehouse-stock", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_warehouse_stock")
        .select("*, storefront_warehouses(name, location)")
        .eq("storefront_warehouses.shop_id", orgId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useWarehouseTransfers(orgId: string) {
  return useQuery({
    queryKey: ["delivery-warehouse-transfers", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_warehouse_transfers")
        .select("*")
        .eq("shop_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDeliveryReturns(orgId: string) {
  return useQuery({
    queryKey: ["delivery-returns", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_returns")
        .select("*")
        .eq("shop_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDeliveryReturnRequests(orgId: string) {
  return useQuery({
    queryKey: ["delivery-return-requests", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_return_requests")
        .select("*")
        .eq("shop_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useCoupons(orgId: string) {
  return useQuery({
    queryKey: ["delivery-coupons", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_coupons")
        .select("*")
        .eq("shop_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDeliveryOrders(orgId: string) {
  return useQuery({
    queryKey: ["delivery-orders", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_orders")
        .select("*")
        .eq("shop_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 8000),
  });
}

export function useDeliveryJobs(orgId: string) {
  return useQuery({
    queryKey: ["delivery-jobs", orgId],
    queryFn: async () => {
      const { data, error } = await db("delivery_jobs")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 8000),
  });
}

export function useDriverSessions(orgId: string) {
  return useQuery({
    queryKey: ["delivery-drivers", orgId],
    queryFn: async () => {
      const { data, error } = await db("driver_sessions")
        .select("*")
        .eq("org_id", orgId)
        .order("last_heartbeat_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 8000),
  });
}

export function useDriverLiveLocations(orgId: string) {
  return useQuery({
    queryKey: ["delivery-driver-locations", orgId],
    queryFn: async () => {
      const { data, error } = await db("drivers_live")
        .select("*")
        .eq("org_id", orgId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 10_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 8000),
  });
}

export function useDeliveryInvoices(orgId: string) {
  return useQuery({
    queryKey: ["delivery-invoices", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_invoices")
        .select("*")
        .eq("shop_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDeliveryShipments(orgId: string) {
  return useQuery({
    queryKey: ["delivery-shipments", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_shipments")
        .select("*")
        .eq("shop_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDeliveryIncidents(orgId: string) {
  return useQuery({
    queryKey: ["delivery-incidents", orgId],
    queryFn: async () => {
      const { data, error } = await db("browser_front_incidents")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 8000),
  });
}

export function useComplianceCases(orgId: string) {
  return useQuery({
    queryKey: ["delivery-compliance", orgId],
    queryFn: async () => {
      const { data, error } = await db("compliance_cases")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDeliveryPricingRules(orgId: string) {
  return useQuery({
    queryKey: ["delivery-pricing-rules", orgId],
    queryFn: async () => {
      const { data, error } = await db("delivery_pricing_rules")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useUserAddresses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await db("user_saved_addresses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });
}

export function useDeliveryNotifications(orgId: string) {
  return useQuery({
    queryKey: ["delivery-notifications", orgId],
    queryFn: async () => {
      const { data, error } = await db("storefront_notification_log")
        .select("*")
        .eq("shop_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDeliveryRatings(orgId: string) {
  return useQuery({
    queryKey: ["delivery-ratings", orgId],
    queryFn: async () => {
      const { data, error } = await db("delivery_ratings")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDriverMetrics(orgId: string) {
  return useQuery({
    queryKey: ["delivery-driver-metrics", orgId],
    queryFn: async () => {
      const { data, error } = await db("driver_metrics")
        .select("*")
        .eq("org_id", orgId)
        .order("recorded_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDeliveryDispatch(orgId: string) {
  return useQuery({
    queryKey: ["delivery-dispatch", orgId],
    queryFn: async () => {
      const { data, error } = await db("dispatch_jobs_v2")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useLiveTrackings(orgId: string) {
  return useQuery({
    queryKey: ["delivery-live-tracking", orgId],
    queryFn: async () => {
      const { data, error } = await db("live_trackings")
        .select("*")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 10_000,
  });
}

export function useInsertMutation(table: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { data, error } = await db(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useUpdateMutation(table: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await db(table).update(fields).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export interface MobilityJobRow {
  id: string;
  status: string;
  job_type: string | null;
  service_level: string | null;
  current_price: number | null;
  quoted_price: number | null;
  currency: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  rider_user_id: string | null;
  buyer_user_id: string | null;
  merchant_id: string | null;
  delivery_fee: number | null;
  package_size: string | null;
  package_description: string | null;
}

export interface RiderPresenceRow {
  user_id: string;
  is_online: boolean;
  is_available: boolean;
  current_status: string | null;
  lat: number | null;
  lng: number | null;
  last_seen_at: string | null;
}

export interface RiderProfileRow {
  id: string;
  user_id: string;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  is_verified: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export function useMobilityJobsDashboard(orgId: string) {
  return useQuery<MobilityJobRow[]>({
    queryKey: ["mobility-jobs-dashboard", orgId],
    queryFn: async () => {
      const { data, error } = await db("mobility_jobs")
        .select("id, status, job_type, service_level, current_price, quoted_price, currency, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, created_at, accepted_at, picked_up_at, completed_at, rider_user_id, buyer_user_id, merchant_id, delivery_fee, package_size, package_description")
        .eq("merchant_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as MobilityJobRow[];
    },
    enabled: !!orgId,
  });
}

export function useRiderPresenceByIds(userIds: string[]) {
  return useQuery<RiderPresenceRow[]>({
    queryKey: ["rider-presence-by-ids", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await db("rider_presence")
        .select("user_id, is_online, is_available, current_status, lat, lng, last_seen_at")
        .in("user_id", userIds);
      if (error) throw error;
      return (data ?? []) as RiderPresenceRow[];
    },
    enabled: userIds.length > 0,
    refetchInterval: 15_000,
  });
}

export function useRiderProfilesByIds(userIds: string[]) {
  return useQuery<RiderProfileRow[]>({
    queryKey: ["rider-profiles-by-ids", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await db("rider_profiles")
        .select("id, user_id, vehicle_type, vehicle_plate, is_verified, rating, created_at, updated_at")
        .in("user_id", userIds);
      if (error) throw error;
      return (data ?? []) as RiderProfileRow[];
    },
    enabled: userIds.length > 0,
  });
}

export function useDriverJobStats(userId: string) {
  return useQuery<MobilityJobRow[]>({
    queryKey: ["driver-job-stats", userId],
    queryFn: async () => {
      const { data, error } = await db("mobility_jobs")
        .select("id, status, current_price, quoted_price, currency, created_at, completed_at, rider_user_id")
        .eq("rider_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as MobilityJobRow[];
    },
    enabled: !!userId,
  });
}

export function useBuyerOrders(userId: string) {
  return useQuery<MobilityJobRow[]>({
    queryKey: ["buyer-orders", userId],
    queryFn: async () => {
      const { data, error } = await db("mobility_jobs")
        .select("id, status, current_price, quoted_price, currency, created_at, completed_at, delivery_fee, package_description")
        .eq("buyer_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as MobilityJobRow[];
    },
    enabled: !!userId,
  });
}
