/**
 * SellerDashboard — Shows all seller businesses with cards.
 * Auto-fetches from marketplace_services + storefront_pages.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SellerBusinessCard from "./SellerBusinessCard";
import { SectionBlock } from "@/components/ui/system";
import { Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function SellerDashboard() {
  const { user, orgId } = useAuth();
  const navigate = useNavigate();

  // Fetch marketplace services (listings)
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["seller-services", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_services")
        .select("id, title, category, city, photo_url, status, active")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Fetch storefronts (shops)
  const { data: shops = [], isLoading: loadingShops } = useQuery({
    queryKey: ["seller-shops", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, vertical, city, logo_url, active")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const isLoading = loadingServices || loadingShops;

  const getStatus = (item: any): "draft" | "pending" | "active" => {
    if (item.status === "draft" || (!item.active && !item.status)) return "draft";
    if (item.status === "pending" || item.status === "pending_review") return "pending";
    if (item.active || item.status === "published" || item.status === "active") return "active";
    return "draft";
  };

  const allBusinesses = [
    ...shops.map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.vertical,
      address: s.city,
      photo_url: s.logo_url,
      status: getStatus(s),
      editPath: `/my-shop/${s.id}`,
      viewPath: `/store/${s.slug || s.id}`,
    })),
    ...services.map((s: any) => ({
      id: s.id,
      name: s.title,
      category: s.category,
      address: s.city,
      photo_url: s.photo_url,
      status: getStatus(s),
      editPath: `/dashboard/seller`,
      viewPath: `/services/${s.id}`,
    })),
  ];

  return (
    <div className="space-y-4">
      <SectionBlock
        title={`My Businesses (${allBusinesses.length})`}
        action={
          <Button
            size="sm"
            className="h-8 rounded-xl text-xs active:scale-[0.97]"
            onClick={() => navigate("/create-listing")}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        }
      >
        <span />
      </SectionBlock>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : allBusinesses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Store className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No businesses yet</p>
          <Button
            className="rounded-xl active:scale-[0.97]"
            onClick={() => navigate("/create-listing")}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create your first listing
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {allBusinesses.map((biz) => (
            <SellerBusinessCard key={biz.id} {...biz} />
          ))}
        </div>
      )}
    </div>
  );
}
