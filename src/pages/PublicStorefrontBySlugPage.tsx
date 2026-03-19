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
  const navigate = useNavigate();
  const [storefront, setStorefront] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [merchantProfile, setMerchantProfile] = useState<any>(null);

  // Detect Arabic browser
  const isArabic = navigator.language?.startsWith("ar");

  useEffect(() => {
    if (!publicSlug) return;
    getPublicStorefrontBySlug(publicSlug).then(async (row) => {
      setStorefront(row);
      setMerchantProfile(row?.merchant_onboarding_profiles ?? null);
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

  const displayName = (item: any, field: string = "name") => {
    const arField = `${field}_ar`;
    if (isArabic && item[arField]) return item[arField];
    if (item[field]) return item[field];
    // Fallback: show whatever is available
    return item[arField] || item[field] || "";
  };

  if (!storefront) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading storefront…</p>
      </div>
    );
  }

  const merchantName = merchantProfile
    ? displayName(merchantProfile, "merchant_name")
    : storefront?.name ?? "Storefront";

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 max-w-lg mx-auto" dir={isArabic ? "rtl" : "ltr"}>
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">{merchantName}</h1>
        {/* Show secondary language name */}
        {merchantProfile && !isArabic && merchantProfile.name_ar && (
          <p className="text-sm text-muted-foreground" dir="rtl">{merchantProfile.name_ar}</p>
        )}
        {merchantProfile && isArabic && merchantProfile.merchant_name && (
          <p className="text-sm text-muted-foreground" dir="ltr">{merchantProfile.merchant_name}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {storefront?.seo_description ?? merchantProfile?.cuisine_type ?? ""}
        </p>
      </div>

      {/* Claim Banner for unclaimed restaurants */}
      {merchantProfile?.onboarding_status === "imported_not_claimed" && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2">
          <Store className="h-6 w-6 mx-auto text-primary" />
          <p className="text-sm font-semibold text-foreground">
            {isArabic ? "هل هذا مطعمك؟" : "Is this your restaurant?"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isArabic ? "سجّل مجانًا وابدأ باستقبال الطلبات" : "Claim it for free and start receiving orders"}
          </p>
          <Button
            size="sm"
            onClick={() => navigate(`/merchant/claim?id=${merchantProfile.id}`)}
          >
            {isArabic ? "سجّل مطعمك" : "Claim this restaurant"}
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {categories.map((cat) => {
          const filtered = items.filter((item: any) => item.category_id === cat.id);
          if (!filtered.length) return null;
          return (
            <div key={cat.id} className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">{displayName(cat)}</h2>
              <div className="space-y-2">
                {filtered.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between border border-border rounded-xl p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{displayName(item)}</p>
                      {/* Show secondary language */}
                      {!isArabic && item.name_ar && (
                        <p className="text-xs text-muted-foreground" dir="rtl">{item.name_ar}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {isArabic && item.description_ar ? item.description_ar : item.description}
                        </p>
                      )}
                      {/* Only show price when not null */}
                      {item.price != null && (
                        <p className="text-xs font-semibold text-primary">{item.price} AED</p>
                      )}
                    </div>
                    <button className="shrink-0 ml-3 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg">
                      {isArabic ? "أضف" : "Add"}
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
