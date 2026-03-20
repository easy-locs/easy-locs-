/**
 * SellerDashboard — Shows all seller businesses (all lifecycle statuses).
 * NO auto-create logic. Only explicit "Start Business" triggers draft creation.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SellerBusinessCard from "./SellerBusinessCard";
import { SectionBlock } from "@/components/ui/system";
import { Plus, Store, Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { createOnboardingDraft } from "@/lib/onboarding/seller-onboarding-flow";
import { toast } from "sonner";

export default function SellerDashboard() {
  const { user, orgId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  // Fetch marketplace services (all statuses visible to seller)
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

  // Fetch storefronts (all statuses visible to seller)
  const { data: shops = [], isLoading: loadingShops } = useQuery({
    queryKey: ["seller-shops", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, vertical, city, logo_url, active, shop_visibility, onboarding_completed")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const isLoading = loadingServices || loadingShops;

  const getStatus = (item: any): "onboarding_draft" | "draft" | "pending" | "active" => {
    // Storefront logic
    if (item.onboarding_completed === false && item.shop_visibility === "private" && !item.active) {
      return "onboarding_draft";
    }
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
      viewPath: s.active ? `/store/${s.slug || s.id}` : undefined,
    })),
    ...services.map((s: any) => ({
      id: s.id,
      name: s.title,
      category: s.category,
      address: s.city,
      photo_url: s.photo_url,
      status: getStatus(s),
      editPath: `/dashboard/seller`,
      viewPath: s.active ? `/services/${s.id}` : undefined,
    })),
  ];

  const handleStartBusiness = async () => {
    if (!user?.id) { toast.error("Please sign in first"); return; }
    setCreating(true);
    try {
      const draft = await createOnboardingDraft({ userId: user.id });
      qc.invalidateQueries({ queryKey: ["seller-shops"] });
      toast.success("Business draft created! Complete your setup.");
      navigate(`/my-shop/${draft.id}`);
    } catch (err) {
      console.error("[onboarding] draft creation failed", err);
      toast.error("Could not create business draft");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionBlock
        title={`My Businesses (${allBusinesses.length})`}
        action={
          <Button
            size="sm"
            className="h-8 rounded-xl text-xs active:scale-[0.97]"
            onClick={handleStartBusiness}
            disabled={creating}
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Start Business
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
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Start your business</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first shop or service listing</p>
          </div>
          <Button
            className="rounded-2xl h-11 px-6 active:scale-[0.97]"
            onClick={handleStartBusiness}
            disabled={creating}
          >
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create your first business
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
