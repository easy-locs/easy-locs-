import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { getPublicStorefrontBySlug } from "@/lib/storefront/public-access";
import { getStorefrontCategories, getStorefrontItems } from "@/lib/storefront/public-storefront";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store } from "lucide-react";

export default function PublicStorefrontBySlugPage() {
  const { publicSlug } = useParams();
  const [storefront, setStorefront] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!publicSlug) return;
    getPublicStorefrontBySlug(publicSlug).then(async (row) => {
      setStorefront(row);
      const merchantId = row?.merchant_profile_id;
      if (!merchantId) return;
      const [cats, menu] = await Promise.all([
        getStorefrontCategories(merchantId),
        getStorefrontItems(merchantId),
      ]);
      setCategories(cats);
      setItems(menu);
    });
  }, [publicSlug]);

  if (!storefront) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading storefront…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {storefront?.merchant_onboarding_profiles?.merchant_name ?? "Storefront"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {storefront?.seo_description ?? storefront?.merchant_onboarding_profiles?.cuisine_type ?? ""}
        </p>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => {
          const filtered = items.filter((item: any) => item.category_id === cat.id);
          if (!filtered.length) return null;
          return (
            <div key={cat.id} className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">{cat.name}</h2>
              <div className="space-y-2">
                {filtered.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between border border-border rounded-xl p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                      <p className="text-xs font-semibold text-primary">{item.price} AED</p>
                    </div>
                    <button className="shrink-0 ml-3 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg">
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
