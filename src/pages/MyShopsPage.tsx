/**
 * MyShopsPage — V7 "My Shops" + Listing Lifecycle Management inside My Business.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Store, Plus, Package } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MyListingsPanel from "@/components/marketplace/MyListingsPanel";

const FB: Record<string, string> = {
  "shops.my_shops": "My Shops",
  "shops.create_new": "Create New Shop",
  "shops.create_desc": "Set up a new storefront",
  "shops.no_my_shops": "No shops yet",
  "shops.no_my_shops_desc": "Create your first shop to start selling.",
  "shops.manage": "Manage Shop",
  "shops.open_public": "View Public Shop",
  "shops.status_published": "Published",
  "shops.status_draft": "Draft",
  "shops.tab_shops": "Shops",
  "shops.tab_listings": "Listings",
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
      const { data, error } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, published, vertical, city, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{tr("shops.my_shops")}</h1>
      </div>

      <div className="px-4 pb-6 max-w-lg mx-auto w-full">
        <Tabs defaultValue="shops" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="shops" className="gap-1.5">
              <Store className="h-3.5 w-3.5" />
              {tr("shops.tab_shops")}
            </TabsTrigger>
            <TabsTrigger value="listings" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {tr("shops.tab_listings")}
            </TabsTrigger>
          </TabsList>

          {/* ─── Shops Tab ─── */}
          <TabsContent value="shops" className="space-y-3">
            {/* Create shop CTA */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => { haptic("light"); navigate("/dashboard/my-shop"); }}
              className="mb-3 w-full rounded-3xl border border-border/50 bg-card p-5 text-left shadow-sm transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tr("shops.create_new")}</p>
                  <p className="text-xs text-muted-foreground">{tr("shops.create_desc")}</p>
                </div>
              </div>
            </motion.button>

            {/* Loading */}
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-44 rounded-3xl bg-muted/40 animate-pulse" />)}
              </div>
            )}

            {/* Empty */}
            {!isLoading && (!shops || shops.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Store className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">{tr("shops.no_my_shops")}</p>
                <p className="text-xs text-muted-foreground mt-1">{tr("shops.no_my_shops_desc")}</p>
              </div>
            )}

            {/* Shop cards */}
            <div className="space-y-4">
              {shops?.map((shop: any, i: number) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="rounded-3xl border border-border/40 bg-card overflow-hidden shadow-sm"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3.5 mb-4">
                      {shop.logo_url ? (
                        <img src={shop.logo_url} alt={shop.name} className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-1 ring-border/20" />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                          <Store className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                        {shop.city && <p className="text-xs text-muted-foreground mt-1">{shop.city}</p>}
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

                    <div className="flex gap-2.5">
                      <button
                        onClick={() => { haptic("light"); navigate(`/dashboard/my-shop/${shop.id}`); }}
                        className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        {tr("shops.manage")}
                      </button>
                      <button
                        onClick={() => { haptic("light"); navigate(`/s/${shop.slug}`); }}
                        className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
                      >
                        {tr("shops.open_public")}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ─── Listings Tab ─── */}
          <TabsContent value="listings">
            <MyListingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
