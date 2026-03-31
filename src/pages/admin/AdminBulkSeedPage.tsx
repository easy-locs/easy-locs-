/**
 * AdminBulkSeedPage — Seeds 20 shops per category across Dubai.
 * All shops created with visibility_mode = 'coming_soon'.
 * Products go into canonical `products` table linked by shop_id.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserFirstOrgId } from "@/repositories/profile.repository";
import { generateAllCategorySeeds, type ShopSeed } from "@/lib/autofill/allCategorySeeder";
import { toast } from "sonner";

export default function AdminBulkSeedPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [launched, setLaunched] = useState(false);

  const runSeed = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to seed shops.");
      setLoading(false);
      return;
    }

    const orgId = await fetchUserFirstOrgId(user.id);

    if (!orgId) {
      toast.error("No organization found for your account.");
      setLoading(false);
      return;
    }

    const seeds = generateAllCategorySeeds();
    setProgress({ done: 0, total: seeds.length, errors: 0 });

    let done = 0;
    let errors = 0;

    for (const seed of seeds) {
      try {
        const slug = seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6);

        // Create storefront page with canonical fields
        const { data: shop, error: shopErr } = await (supabase as any)
          .from("storefront_pages")
          .insert({
            name: seed.name,
            slug,
            vertical: seed.vertical,
            category: seed.category,
            subcategory: seed.subcategory,
            city: "Dubai",
            country: "AE",
            address: seed.area + ", Dubai",
            latitude: seed.lat,
            longitude: seed.lng,
            logo_url: seed.logo_url,
            banner_url: seed.cover_url,
            visibility_mode: "coming_soon",
            ranking_score: 50 + Math.floor(Math.random() * 45),
            rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
            reviews_count: Math.floor(Math.random() * 300),
            org_id: orgId,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (shopErr) throw shopErr;

        // Insert products into canonical products table
        if (seed.menu_items.length > 0 && shop?.id) {
          await (supabase as any)
            .from("products")
            .insert(
              seed.menu_items.map((item, idx) => ({
                shop_id: shop.id,
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category,
                subcategory: seed.subcategory,
                currency: "AED",
                sort_order: idx + 1,
                is_available: true,
              }))
            );
        }

        done++;
      } catch (err: any) {
        errors++;
        console.error(`[seed] Failed: ${seed.name}`, err.message);
      }
      setProgress({ done: done + errors, total: seeds.length, errors });
    }

    toast.success(`Seeded ${done} shops (${errors} errors)`);
    setLoading(false);
  };

  const bulkLaunch = async () => {
    setLaunched(true);
    const { error } = await (supabase as any)
      .from("storefront_pages")
      .update({ visibility_mode: "live" })
      .eq("visibility_mode", "coming_soon");

    if (error) {
      toast.error("Launch failed: " + error.message);
    } else {
      toast.success("All ready shops launched!");
    }
    setLaunched(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold"
        >←</button>
        <div>
          <h1 className="text-lg font-bold">🏪 Bulk Category Seeder</h1>
          <p className="text-xs text-muted-foreground">20 shops × 14 categories = 280 shops across Dubai</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {["🍕 Food", "🛒 Grocery", "🔧 Services", "💅 Beauty", "☕ Coffee", "🍽️ Dine Out", "🚕 Mobility", "🏠 Property", "🚚 Delivery", "🏨 Stays", "✈️ Travel", "🎯 Concierge", "🚗 Rentals", "💳 Wallet"].map(c => (
            <div key={c} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/30 border border-border/10">
              <span>{c}</span>
              <span className="ml-auto text-muted-foreground">×20</span>
            </div>
          ))}
        </div>

        {progress.total > 0 && (
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {progress.done}/{progress.total} — {progress.errors} errors
            </p>
          </div>
        )}

        <button
          onClick={runSeed}
          disabled={loading}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {loading ? `Seeding... ${progress.done}/${progress.total}` : "🌱 Seed All Categories (waiting_launch)"}
        </button>

        <div className="border-t border-border/20 pt-3">
          <p className="text-[10px] text-muted-foreground mb-2">⚠️ All shops are created with <strong>waiting_launch</strong> status. No outbound messages until you launch.</p>
          <button
            onClick={bulkLaunch}
            disabled={launched}
            className="w-full rounded-2xl bg-green-600 dark:bg-green-700 text-white px-4 py-3 text-sm font-bold disabled:opacity-50"
          >
            {launched ? "Launching..." : "🚀 Bulk Launch All Ready Shops"}
          </button>
        </div>
      </div>
    </div>
  );
}
