/**
 * SellerDashboard — Shows all seller businesses (all lifecycle statuses).
 * Uses canonical repository + businessLifecycle for status resolution.
 * ZERO direct Supabase imports.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSellerServices, fetchSellerShops } from "@/repositories/seller-repository";
import SellerBusinessCard from "./SellerBusinessCard";
import SellerListingLifecycleCard from "./SellerListingLifecycleCard";
import { SectionBlock } from "@/components/ui/system";
import { Plus, Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { createOnboardingDraft } from "@/lib/onboarding/seller-onboarding-flow";
import { resolveBusinessStatus, validateBusinessReadiness } from "@/lib/seller/businessLifecycle";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export default function SellerDashboard() {
  const { user, orgId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);

  // Fetch via canonical repository
  const { data: services = [], isLoading: loadingServices, refetch: refetchServices } = useQuery({
    queryKey: ["seller-services", orgId],
    queryFn: () => fetchSellerServices(orgId!),
    enabled: !!orgId,
  });

  const { data: shops = [], isLoading: loadingShops } = useQuery({
    queryKey: ["seller-shops", user?.id],
    queryFn: () => fetchSellerShops(user!.id),
    enabled: !!user?.id,
  });

  const isLoading = loadingServices || loadingShops;

  const allBusinesses = [
    ...shops.map((s) => {
      const status = resolveBusinessStatus(s);
      const { requirements } = validateBusinessReadiness(s);
      return {
        id: s.id,
        name: s.name,
        category: s.vertical,
        address: s.city,
        photo_url: s.logo_url,
        status,
        editPath: `/my-shop/${s.id}`,
        viewPath: s.active ? `/s/${s.slug || s.id}` : undefined,
        slug: s.slug,
        requirements,
      };
    }),
    ...services.filter((s) => s.listing_type !== "sale").map((s) => ({
      id: s.id,
      name: s.title,
      category: s.category,
      address: s.city,
      photo_url: s.photo_url,
      status: resolveBusinessStatus(s),
      editPath: `/dashboard/seller`,
      viewPath: s.active ? `/services/${s.id}` : undefined,
    })),
  ];

  // Real estate / seasonal listings get lifecycle cards
  const seasonalListings = services.filter((s) =>
    s.listing_type === "sale" || s.listing_expires_at
  );

  const handleStartBusiness = async () => {
    if (!user?.id) { toast.error(t("seller.sign_in_first")); return; }
    setCreating(true);
    try {
      const draftId = await createOnboardingDraft(user.id);
      qc.invalidateQueries({ queryKey: ["seller-shops"] });
      toast.success(t("seller.draft_created"));
      navigate(`/my-shop/${draftId}`);
    } catch (err) {
      console.error("[onboarding] draft creation failed", err);
      toast.error(t("seller.draft_error"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionBlock
        title={t("seller.my_businesses").replace("{count}", String(allBusinesses.length))}
        action={
          <Button
            size="sm"
            className="h-8 rounded-xl text-xs active:scale-[0.97]"
            onClick={handleStartBusiness}
            disabled={creating}
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            {t("seller.start_business")}
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
      ) : allBusinesses.length === 0 && seasonalListings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{t("seller.start_your_business")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("seller.create_first_desc")}</p>
          </div>
          <Button
            className="rounded-2xl h-11 px-6 active:scale-[0.97]"
            onClick={handleStartBusiness}
            disabled={creating}
          >
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {t("seller.create_first_business")}
          </Button>
        </div>
      ) : (
        <>
          {allBusinesses.length > 0 && (
            <div className="space-y-2.5">
              {allBusinesses.map((biz) => (
                <SellerBusinessCard key={biz.id} {...biz} />
              ))}
            </div>
          )}

          {/* Seasonal / Real Estate Listing Lifecycle Cards */}
          {seasonalListings.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="text-sm font-bold text-foreground px-1">{t("seller.listings_count").replace("{count}", String(seasonalListings.length))}</h3>
              {seasonalListings.map((s) => (
                <SellerListingLifecycleCard
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  status={s.status}
                  active={s.active}
                  listing_expires_at={s.listing_expires_at}
                  auto_renew_enabled={s.auto_renew_enabled}
                  boost_enabled={s.boost_enabled}
                  boost_multiplier={s.boost_multiplier}
                  boost_expires_at={s.boost_expires_at}
                  renewal_count={s.renewal_count}
                  onRefresh={() => refetchServices()}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
