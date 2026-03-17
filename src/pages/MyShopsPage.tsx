/**
 * MyShopsPage — V7 "My Shops" inside My Business.
 * Each card: logo, name, status badge, city + 2 clear CTAs: Manage / Open Public.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Store, Settings, ExternalLink, Plus, MapPin } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { motion } from "framer-motion";

const FB: Record<string, string> = {
  "shops.my_shops": "My Shops",
  "shops.create_new": "Create New Shop",
  "shops.create_desc": "Set up a new storefront",
  "shops.no_shops": "No shops yet",
  "shops.no_shops_desc": "Create your first shop to start selling.",
  "shops.manage": "Manage Shop",
  "shops.open_public": "View Public Shop",
  "shops.status_published": "Published",
  "shops.status_draft": "Draft",
};

export default function MyShopsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tr = (k: string) => { const v = t(k); return v && v !== k ? v : FB[k] || k.split(".").pop() || ""; };

  const { data: shops, isLoading } = useQuery({
    queryKey: ["my-shops", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, published, vertical, city, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <MobilePageHeader title={tr("shops.my_shops")} backTo="/business" />

      <div className="px-4 pt-3 pb-6 space-y-3 max-w-lg mx-auto w-full">
        {/* Create shop CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => { haptic("light"); navigate("/dashboard/my-shop"); }}
          className="w-full active:scale-[0.98] transition-transform"
        >
          <div className="rounded-2xl border-2 border-dashed border-primary/25 p-4 flex items-center gap-3.5 hover:border-primary/40 transition-colors bg-primary/[0.02]">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{tr("shops.create_new")}</p>
              <p className="text-xs text-muted-foreground">{tr("shops.create_desc")}</p>
            </div>
          </div>
        </motion.button>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!shops || shops.length === 0) && (
          <EmptyState
            icon={Store}
            title={tr("shops.no_shops")}
            description={tr("shops.no_shops_desc")}
          />
        )}

        {/* Shop cards */}
        {shops?.map((shop: any, i: number) => (
          <motion.div
            key={shop.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className="rounded-2xl border border-border/40 bg-card overflow-hidden"
          >
            <div className="p-4">
              {/* Shop info */}
              <div className="flex items-start gap-3.5 mb-4">
                {shop.logo_url ? (
                  <img
                    src={shop.logo_url}
                    alt={shop.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-border/20"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                  {shop.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 shrink-0" /> {shop.city}
                    </p>
                  )}
                  <div className="mt-1.5">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      shop.published
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${shop.published ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {shop.published ? tr("shops.status_published") : tr("shops.status_draft")}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2 Clear action buttons — always visible */}
              <div className="flex gap-2.5">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2 text-xs font-semibold h-10 rounded-xl"
                  onClick={() => { haptic("light"); navigate("/dashboard/my-shop"); }}
                >
                  <Settings className="h-3.5 w-3.5" />
                  {tr("shops.manage")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 text-xs font-semibold h-10 rounded-xl border-border/50"
                  onClick={() => { haptic("light"); navigate(`/s/${shop.slug}`); }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {tr("shops.open_public")}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
