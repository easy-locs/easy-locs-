/**
 * AdminBulkSeedPage — Seeds 20 shops per category across Dubai.
 * All shops created with launch_status = 'waiting_launch'.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateAllCategorySeeds, type ShopSeed } from "@/lib/autofill/allCategorySeeder";
import { toast } from "sonner";

export default function AdminBulkSeedPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [launched, setLaunched] = useState(false);

  const runSeed = async () => {
    setLoading(true);
    const seeds = generateAllCategorySeeds();
    setProgress({ done: 0, total: seeds.length, errors: 0 });

    let done = 0;
    let errors = 0;

    for (const seed of seeds) {
      try {
        // Create storefront page
        const { data: shop, error: shopErr } = await (supabase as any)
          .from("storefront_pages")
          .insert({
            name: seed.name,
            public_slug: seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6),
            vertical: seed.vertical,
            city: "Dubai",
            country: "AE",
            address: seed.area + ", Dubai",
            latitude: seed.lat,
            longitude: seed.lng,
            logo_url: seed.logo_url,
            status: "active",
            launch_status: "waiting_launch",
            metadata_json: {
              category: seed.category,
              subcategory: seed.subcategory,
              auto_seeded: true,
              area: seed.area,
            },
          })
          .select("id")
          .single();

        if (shopErr) throw shopErr;

        // Also insert into seed_merchants for marketplace discovery
        await (supabase as any)
          .from("seed_merchants")
          .insert({
            name: seed.name,
            category: seed.vertical === "food" ? "food" : seed.vertical === "grocery" ? "grocery" : "services",
            subcategory: seed.subcategory,
            city: "Dubai",
            area: seed.area,
            cover_image: seed.logo_url,
            logo_image: seed.logo_url,
            is_active: true,
            is_open: true,
            is_featured: false,
            visibility_score: 70 + Math.floor(Math.random() * 25),
            rating: 3.8 + Math.random() * 1.2,
            review_count: Math.floor(Math.random() * 200),
            delivery_time_min: 15 + Math.floor(Math.random() * 20),
            delivery_time_max: 35 + Math.floor(Math.random() * 20),
            latitude: seed.lat,
            longitude: seed.lng,
          } as any)
          .select("id")
          .single();

        // Insert menu items as seed_products
        if (seed.menu_items.length > 0) {
          const merchantResult = await (supabase as any)
            .from("seed_merchants")
            .select("id")
            .eq("name", seed.name)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (merchantResult.data?.id) {
            await (supabase as any)
              .from("seed_products")
              .insert(
                seed.menu_items.map((item, idx) => ({
                  merchant_id: merchantResult.data.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  category: item.category,
                  sort_order: idx + 1,
                  is_available: true,
                })) as any
              );
          }
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
      .update({ launch_status: "launched" })
      .eq("launch_status", "waiting_launch");

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
            className="w-full rounded-2xl bg-emerald-600 text-white px-4 py-3 text-sm font-bold disabled:opacity-50"
          >
            {launched ? "Launching..." : "🚀 Bulk Launch All Ready Shops"}
          </button>
        </div>
      </div>
    </div>
  );
}
