import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { useStorefrontCart } from "@/hooks/useStorefrontCart";
import { useStorefrontCurrency } from "@/hooks/useStorefrontCurrency";
import SubPageShell from "@/components/layout/SubPageShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import WishlistButton from "@/components/wishlist/WishlistButton";
import {
  ChevronRight, ArrowLeft, ShoppingCart, Plus, Minus, Loader2,
  Star, Package, Truck, Share2, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";

const ReviewComposer = lazy(() => import("@/components/reviews/ReviewComposer"));
const StarRating = lazy(() => import("@/components/social/StarRating"));

type Tab = "description" | "specs" | "reviews";

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      const { data, error } = await db
        .from("catalog_items")
        .select("*, storefront_pages!catalog_items_shop_id_fkey(id, name, slug, logo_url, currency, city), storefront_catalog_categories(name)")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      const { data } = await db.from("catalog_variants").select("*").eq("item_id", productId!).order("name");
      return data ?? [];
    },
    enabled: !!productId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data } = await db
        .from("reviews")
        .select("*")
        .eq("entity_id", productId!)
        .eq("entity_type", "catalog_item")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!productId,
  });

  const { data: similarProducts = [] } = useQuery({
    queryKey: ["similar-products", product?.category_id, productId],
    queryFn: async () => {
      if (!product?.category_id) return [];
      const { data } = await db
        .from("catalog_items")
        .select("id, title, price, photo_url, photo_urls, compare_at_price")
        .eq("category_id", product.category_id)
        .eq("available", true)
        .neq("id", productId!)
        .limit(6);
      return data ?? [];
    },
    enabled: !!product?.category_id,
  });

  const shop = product?.storefront_pages;
  const cart = useStorefrontCart(shop?.id);
  const fx = useStorefrontCurrency(shop?.currency || "AED");

  const variantAxes = useMemo(() => {
    const axisMap = new Map<string, Set<string>>();
    variants.forEach((v: any) => {
      const opts = v.option_values || {};
      Object.entries(opts).forEach(([key, val]) => {
        if (!axisMap.has(key)) axisMap.set(key, new Set());
        axisMap.get(key)!.add(val as string);
      });
    });
    const result: { name: string; values: string[] }[] = [];
    axisMap.forEach((vals, name) => result.push({ name, values: Array.from(vals) }));
    return result;
  }, [variants]);

  const selectedVariant = useMemo(() => {
    if (variantAxes.length === 0) return null;
    return variants.find((v: any) => {
      const opts = v.option_values || {};
      return variantAxes.every(axis => opts[axis.name] === selectedOptions[axis.name]);
    });
  }, [variants, variantAxes, selectedOptions]);

  const isVariantAvailable = (axisName: string, value: string) => {
    const testOpts = { ...selectedOptions, [axisName]: value };
    return variants.some((v: any) => {
      const opts = v.option_values || {};
      return Object.entries(testOpts).every(([k, val]) => !val || opts[k] === val) && v.available && v.stock_quantity > 0;
    });
  };

  const finalPrice = useMemo(() => {
    const base = product?.price || 0;
    if (selectedVariant) return base + (selectedVariant.price_adjustment || 0);
    return base;
  }, [product?.price, selectedVariant]);

  const maxStock = selectedVariant ? selectedVariant.stock_quantity : (product?.stock_quantity || 99);
  const inStock = maxStock > 0;

  const photos = useMemo(() => {
    if (!product) return [];
    const urls: string[] = [];
    if (product.photo_urls && Array.isArray(product.photo_urls)) urls.push(...product.photo_urls);
    else if (product.photo_url) urls.push(product.photo_url);
    if (selectedVariant?.photo_url) return [selectedVariant.photo_url, ...urls.filter((u: string) => u !== selectedVariant.photo_url)];
    return urls;
  }, [product, selectedVariant]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  const specs = product?.specifications || {};
  const dimensions = product?.dimensions_json || {};
  const warranty = product?.warranty_info || {};

  const handleAddToCart = () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (variantAxes.length > 0 && !selectedVariant) { toast.error("Please select all options"); return; }
    if (!inStock) { toast.error("Out of stock"); return; }
    cart.addItem(product.id, finalPrice, quantity);
    toast.success(`Added ${quantity} to cart`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product?.title, url: window.location.href });
    } else {
      const { copyToClipboard } = await import("@/lib/clipboard");
      const r = await copyToClipboard(window.location.href);
      if (r.ok) toast.success("Link copied");
    }
  };

  if (isLoading) {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </SubPageShell>
    );
  }

  if (!product) {
    return (
      <SubPageShell noContentPad className="flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground font-medium">Product not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Go back</Button>
      </SubPageShell>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "specs", label: "Details" },
    { id: "reviews", label: `Reviews (${reviews.length})` },
  ];

  return (
    <>
      <SEOHead
        title={`${product.title} | ${shop?.name || "Shop"}`}
        description={product.description || product.seo_description || `Buy ${product.title}`}
        ogImage={photos[0]}
      />
      <SubPageShell noContentPad>
        <nav aria-label="Breadcrumb" className="px-4 py-2 flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          {shop && (
            <>
              <Link to={`/s/${shop.slug}`} className="hover:text-foreground shrink-0">{shop.name}</Link>
              <ChevronRight className="w-3 h-3 shrink-0" />
            </>
          )}
          {product.storefront_catalog_categories?.name && (
            <>
              <span className="shrink-0">{product.storefront_catalog_categories.name}</span>
              <ChevronRight className="w-3 h-3 shrink-0" />
            </>
          )}
          <span className="text-foreground font-medium line-clamp-1">{product.title}</span>
        </nav>

        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="absolute top-3 left-3 z-20 h-9 w-9 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>

        <div className="max-w-2xl mx-auto">
          {photos.length > 0 && (
            <div className="relative">
              <div className="aspect-square bg-muted overflow-hidden">
                <img
                  src={photos[activeImageIndex] || photos[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 px-4 py-2 overflow-x-auto">
                  {photos.map((url: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      aria-label={`View image ${i + 1} of ${photos.length}`}
                      aria-pressed={i === activeImageIndex}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === activeImageIndex ? "border-primary" : "border-transparent"}`}
                    >
                      <img src={url} alt={`${product.title} - image ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <WishlistButton itemId={product.id} shopId={shop?.id} variantId={selectedVariant?.id} />
                <button onClick={handleShare} aria-label="Share product" className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="px-4 py-4 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">{product.title}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                {avgRating > 0 && (
                  <button onClick={() => setActiveTab("reviews")} className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                    <Star className="h-3.5 w-3.5 fill-amber-500" />
                    {avgRating.toFixed(1)} ({reviews.length})
                  </button>
                )}
                {product.brand_name && <Badge variant="outline" className="text-[0.625rem]">{product.brand_name}</Badge>}
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-primary">{fx.formatPrice(finalPrice)}</span>
                {product.compare_at_price && product.compare_at_price > finalPrice && (
                  <span className="text-sm text-muted-foreground line-through">{fx.formatPrice(product.compare_at_price)}</span>
                )}
                {variants.length > 0 && !selectedVariant && (
                  <span className="text-xs text-muted-foreground">from</span>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                {inStock ? (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 text-[0.625rem]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> In Stock
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[0.625rem]">
                    <XCircle className="h-3 w-3 mr-1" /> Out of Stock
                  </Badge>
                )}
                {product.compare_at_price && product.compare_at_price > finalPrice && (
                  <Badge className="bg-red-50 text-red-700 text-[0.625rem]">
                    -{Math.round((1 - finalPrice / product.compare_at_price) * 100)}%
                  </Badge>
                )}
              </div>
            </div>

            {variantAxes.length > 0 && (
              <div className="space-y-3">
                {variantAxes.map(axis => (
                  <div key={axis.name}>
                    <Label className="text-xs font-semibold mb-1.5 block">{axis.name}</Label>
                    <div className="flex flex-wrap gap-2">
                      {axis.values.map(val => {
                        const available = isVariantAvailable(axis.name, val);
                        const selected = selectedOptions[axis.name] === val;
                        return (
                          <button
                            key={val}
                            disabled={!available}
                            aria-pressed={selected}
                            onClick={() => setSelectedOptions(prev => ({ ...prev, [axis.name]: val }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : available
                                  ? "border-border hover:border-primary/50"
                                  : "border-border/30 text-muted-foreground/50 line-through cursor-not-allowed"
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {selectedVariant && maxStock > 0 && maxStock <= 10 && (
                  <p className="text-xs text-amber-600">{maxStock} left in stock</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-lg">
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold" role="status" aria-live="polite">{quantity}</span>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setQuantity(Math.min(maxStock, quantity + 1))} aria-label="Increase quantity">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button className="flex-1 h-11 font-semibold rounded-xl gap-2" onClick={handleAddToCart} disabled={!inStock || cart.loading}>
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
            </div>

            <div className="flex gap-1 border-b border-border/30 mt-6" role="tablist" aria-label="Product details">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-semibold transition-all relative ${
                    activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="product-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "description" && (
                <motion.div key="desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="prose prose-sm max-w-none text-sm text-muted-foreground">
                  <p className="whitespace-pre-line leading-relaxed">{product.description || "No description available."}</p>
                </motion.div>
              )}

              {activeTab === "specs" && (
                <motion.div key="specs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="border rounded-lg divide-y">
                    {product.weight_grams && (
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Weight</span>
                        <span className="font-medium">{product.weight_grams >= 1000 ? `${(product.weight_grams / 1000).toFixed(1)} kg` : `${product.weight_grams} g`}</span>
                      </div>
                    )}
                    {dimensions.length && (
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Dimensions</span>
                        <span className="font-medium">{dimensions.length} x {dimensions.width} x {dimensions.height} cm</span>
                      </div>
                    )}
                    {product.brand_name && (
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Brand</span>
                        <span className="font-medium">{product.brand_name}</span>
                      </div>
                    )}
                    {specs.material && (
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Material</span>
                        <span className="font-medium">{specs.material}</span>
                      </div>
                    )}
                    {specs.care_instructions && (
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Care</span>
                        <span className="font-medium">{Array.isArray(specs.care_instructions) ? specs.care_instructions.join(", ") : specs.care_instructions}</span>
                      </div>
                    )}
                    {warranty.duration_months && (
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Warranty</span>
                        <span className="font-medium">{warranty.duration_months} months{warranty.conditions ? ` — ${warranty.conditions}` : ""}</span>
                      </div>
                    )}
                    {Object.entries(specs).filter(([k]) => !["material", "care_instructions"].includes(k)).map(([key, val]) => (
                      <div key={key} className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-medium">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "reviews" && (
                <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No reviews yet</p>
                  ) : (
                    reviews.map((review: any) => (
                      <AppCard key={review.id}>
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`h-3 w-3 ${s <= (review.rating || 0) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                            <span className="text-[0.625rem] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                          {review.comment && <p className="text-xs text-foreground">{review.comment}</p>}
                          {review.reviewer_name && <p className="text-[0.625rem] text-muted-foreground">— {review.reviewer_name}</p>}
                        </CardContent>
                      </AppCard>
                    ))
                  )}
                  {user && (
                    <Suspense fallback={null}>
                      <ReviewComposer entityId={productId!} entityType="catalog_item" />
                    </Suspense>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {similarProducts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold mb-3">Similar Products</h3>
                <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
                  {similarProducts.map((sp: any) => {
                    const spPhoto = sp.photo_url || (sp.photo_urls && sp.photo_urls[0]);
                    return (
                      <Link
                        key={sp.id}
                        to={`/product/${sp.id}`}
                        className="shrink-0 w-[130px] rounded-xl border border-border/15 bg-card overflow-hidden"
                      >
                        {spPhoto && <img src={spPhoto} alt={sp.title} className="aspect-square w-full object-cover" loading="lazy" />}
                        <div className="p-2.5">
                          <p className="text-[0.6875rem] font-semibold line-clamp-2">{sp.title}</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{fx.formatPrice(sp.price)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {shop && (
              <div className="mt-4 p-3 rounded-xl bg-muted/20 flex items-center gap-3">
                <Truck className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium">Delivery by {shop.name}</p>
                  {shop.city && <p className="text-[0.625rem] text-muted-foreground">{shop.city} area</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </SubPageShell>
    </>
  );
}

function Label({ className, children, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return <label className={className} {...props}>{children}</label>;
}
