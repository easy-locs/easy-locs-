/**
 * /p/:productId — Public product deep-link.
 * No login required to view. Shows product + shop info + buy CTA.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, MessageCircle, Share2, ArrowLeft, Store } from "lucide-react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import UniversalShareEngine from "@/components/storefront/UniversalShareEngine";

export default function ProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["public-product", productId],
    queryFn: async () => {
      const { data: item } = await (supabase as any)
        .from("catalog_items")
        .select("*, storefront_pages!catalog_items_shop_id_fkey(id, slug, name, logo_url, currency)")
        .eq("id", productId)
        .maybeSingle();
      return item;
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">Product not found</p>
          <Link to="/discover">
            <Button variant="outline" size="sm"><ArrowLeft className="h-3 w-3 mr-1" /> Discover</Button>
          </Link>
        </div>
      </div>
    );
  }

  const shop = data.storefront_pages;
  const currency = data.currency || shop?.currency || "EUR";
  const price = data.price != null ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(data.price) : null;
  const photos = [data.photo_url, ...(Array.isArray(data.photo_urls) ? data.photo_urls : [])].filter(Boolean);

  return (
    <>
      <SEOHead
        title={`${data.title} — ${shop?.name || "Shop"}`}
        description={data.description?.slice(0, 160) || data.title}
        ogImage={photos[0]}
      />
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={data.title} backTo={shop ? `/s/${shop.slug}` : "/discover"} />

        <div className="max-w-md mx-auto pb-28">
          {/* Product image */}
          {photos[0] && (
            <div className="aspect-square w-full overflow-hidden">
              <img src={photos[0]} alt={data.title} className="w-full h-full object-cover" loading="eager" />
            </div>
          )}

          <div className="px-4 pt-4 space-y-4">
            {/* Title + price */}
            <div>
              <h1 className="text-xl font-bold text-foreground">{data.title}</h1>
              {price && <p className="text-lg font-bold text-primary mt-1">{price}</p>}
              {data.compare_at_price && data.compare_at_price > (data.price || 0) && (
                <span className="text-xs text-muted-foreground line-through ml-2">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency }).format(data.compare_at_price)}
                </span>
              )}
            </div>

            {/* Tags */}
            {data.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.tags.slice(0, 5).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {data.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>
            )}

            {/* Shop card */}
            {shop && (
              <Link
                to={`/s/${shop.slug}`}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                  {shop.logo_url
                    ? <img src={shop.logo_url} alt="" className="w-9 h-9 rounded-xl object-cover" />
                    : <Store className="h-4 w-4 text-primary" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{shop.name}</p>
                  <p className="text-[10px] text-muted-foreground">View shop</p>
                </div>
              </Link>
            )}

            {/* Share */}
            <div className="flex justify-center">
              <UniversalShareEngine
                type="product"
                slug={productId || ""}
                title={data.title}
                description={data.description}
                imageUrl={photos[0]}
                price={price || undefined}
              />
            </div>
          </div>
        </div>

        {/* Sticky buy bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 flex gap-2 z-40" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 12px)" }}>
          <Link to={shop ? `/s/${shop.slug}?chat=1` : `/login`} className="flex-shrink-0">
            <Button variant="outline" size="icon" className="h-11 w-11">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </Link>
          <Link to={shop ? `/s/${shop.slug}?addToCart=${productId}` : `/login`} className="flex-1">
            <Button className="w-full h-11 gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4" />
              {price ? `Buy · ${price}` : "Add to cart"}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
