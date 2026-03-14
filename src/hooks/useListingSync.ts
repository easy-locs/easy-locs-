/**
 * useListingSync — centralized listing synchronization hook.
 * Provides realtime updates, status management, and cache invalidation
 * for the marketplace_services table (single source of truth).
 */
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";

/* ─── Types ─── */
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "paused"
  | "sold"
  | "rented"
  | "archived"
  | "deleted";

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  published: "Published",
  paused: "Paused",
  sold: "Sold",
  rented: "Rented",
  archived: "Archived",
  deleted: "Deleted",
};

export const LISTING_STATUS_COLORS: Record<ListingStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-500/10 text-yellow-600",
  published: "bg-green-500/10 text-green-600",
  paused: "bg-orange-500/10 text-orange-600",
  sold: "bg-blue-500/10 text-blue-600",
  rented: "bg-purple-500/10 text-purple-600",
  archived: "bg-muted text-muted-foreground",
  deleted: "bg-destructive/10 text-destructive",
};

/* Query keys used across the platform for listings */
const LISTING_QUERY_KEYS = [
  ["my_marketplace_services"],
  ["browse_marketplace_services"],
  ["my_listings"],
  ["explore_listings"],
  ["saved_listings"],
  ["listing_detail"],
];

/* ─── Realtime Sync Hook ─── */
export function useListingRealtimeSync(orgId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`listing-sync-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_services",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          // Invalidate all listing-related queries on any change
          LISTING_QUERY_KEYS.forEach((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);
}

/* Global realtime for public explore feed (all listings) */
export function useExploreRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("explore-listing-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_services",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["browse_marketplace_services"] });
          queryClient.invalidateQueries({ queryKey: ["explore_listings"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/* ─── My Listings Query ─── */
export function useMyListings(providerId?: string) {
  return useQuery({
    queryKey: ["my_listings", providerId],
    queryFn: async () => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from("marketplace_services")
        .select("*")
        .eq("provider_id", providerId)
        .neq("status", "deleted" as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
  });
}

/* ─── Status Mutation ─── */
export function useListingStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      status,
    }: {
      listingId: string;
      status: ListingStatus;
    }) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };

      // Keep active boolean in sync for backward compatibility
      updateData.active = status === "published";

      const { error } = await supabase
        .from("marketplace_services")
        .update(updateData)
        .eq("id", listingId);

      if (error) throw error;
    },
    onSuccess: (_, { listingId, status }) => {
      LISTING_QUERY_KEYS.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      toast.success(`Listing ${LISTING_STATUS_LABELS[status].toLowerCase()}`);

      // Emit platform bus event
      if (status === "published") {
        platformBus.emit("marketplace:listing_published", { listingId }, "marketplace");
      } else if (status === "paused") {
        platformBus.emit("marketplace:listing_paused", { listingId }, "marketplace");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update listing status");
    },
  });
}

/* ─── Update Listing Mutation ─── */
export function useUpdateListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      data,
    }: {
      listingId: string;
      data: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from("marketplace_services")
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      LISTING_QUERY_KEYS.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      toast.success("Listing updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update listing");
    },
  });
}

/* ─── Booking confirmation → auto-update availability ─── */
export function useBookingConfirmationSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("booking-listing-sync")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "marketplace_bookings",
        },
        (payload) => {
          try {
            const booking = payload.new as any;
            if (
              booking &&
              (booking.status === "confirmed" || booking.status === "cancelled")
            ) {
              // Invalidate listing + availability queries
              LISTING_QUERY_KEYS.forEach((key) =>
                queryClient.invalidateQueries({ queryKey: key })
              );
              queryClient.invalidateQueries({
                queryKey: ["service_availability"],
              });
            }
          } catch {
            // silent
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/* ─── Combined provider hook for pages ─── */
export function useListingSync() {
  const { orgId } = useAuth();

  // Activate all realtime channels
  useListingRealtimeSync(orgId || undefined);
  useBookingConfirmationSync();

  const statusMutation = useListingStatusMutation();
  const updateMutation = useUpdateListingMutation();

  const changeStatus = useCallback(
    (listingId: string, status: ListingStatus) => {
      statusMutation.mutate({ listingId, status });
    },
    [statusMutation]
  );

  const updateListing = useCallback(
    (listingId: string, data: Record<string, any>) => {
      updateMutation.mutate({ listingId, data });
    },
    [updateMutation]
  );

  return {
    changeStatus,
    updateListing,
    isUpdating: statusMutation.isPending || updateMutation.isPending,
  };
}
