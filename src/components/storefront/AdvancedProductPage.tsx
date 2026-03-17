/**
 * AdvancedProductPage — Rich product detail with gallery, specs, video, SEO
 * Used inside ShopPage when a product is selected
 */
import { useState } from "react";
import ProductMediaUploader from "./ProductMediaUploader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, ChevronLeft, ChevronRight, Star, Package, Ruler, Shield, Tag, X } from "lucide-react";

interface Props {
  item: any;
  currency?: string;
  formatPrice?: (n: number, c?: string) => string;
  onAddToCart?: (itemId: string, price: number) => void;
  onClose?: () => void;
  editMode?: boolean;
  onSave?: (updates: any) => void;
}

export default function AdvancedProductPage({ item, currency = "EUR", formatPrice, onAddToCart, onClose, editMode = false, onSave }: Props) {
  const [currentImage, setCurrentImage] = useState(0);

  // Collect existing images for media uploader
  const existingImages: string[] = [];
  if (item.photo_url) existingImages.push(item.photo_url);
  if (Array.isArray(item.photo_urls)) existingImages.push(...item.photo_urls);
  if (Array.isArray(item.gallery_urls)) existingImages.push(...item.gallery_urls);
  const dedupedImages = [...new Set(existingImages)].filter(Boolean);

  const [editImages, setEditImages] = useState<string[]>(dedupedImages);
  const [editVideoUrl, setEditVideoUrl] = useState(item.video_url || "");
  const [editCoverIndex, setEditCoverIndex] = useState(0);
  const [editData, setEditData] = useState({
    seo_title: item.seo_title || "",
    seo_description: item.seo_description || "",
    weight_grams: item.weight_grams || "",
    brand_name: item.brand_name || "",
    warranty_info: item.warranty_info || "",
    specifications: item.specifications || [],
  });

  const fmt = formatPrice || ((n: number, c?: string) => `${n} ${c || currency}`);

  // Collect all images
  const allImages: string[] = [];
  if (item.photo_url) allImages.push(item.photo_url);
  if (Array.isArray(item.photo_urls)) allImages.push(...item.photo_urls);
  if (Array.isArray(item.gallery_urls)) allImages.push(...item.gallery_urls);
  const uniqueImages = [...new Set(allImages)].filter(Boolean);

  const specs: { key: string; value: string }[] = Array.isArray(item.specifications) ? item.specifications : [];

  // EDIT MODE (seller)
  if (editMode) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-semibold">Advanced Product Details</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px]">Brand</Label>
              <Input value={editData.brand_name} onChange={e => setEditData(p => ({ ...p, brand_name: e.target.value }))}
                className="mt-1 h-8 text-xs" placeholder="Brand name" />
            </div>
            <div>
              <Label className="text-[10px]">Weight (g)</Label>
              <Input type="number" value={editData.weight_grams} onChange={e => setEditData(p => ({ ...p, weight_grams: e.target.value }))}
                className="mt-1 h-8 text-xs" placeholder="0" />
            </div>
          </div>

          {/* Media upload replaces video URL input */}
          <ProductMediaUploader
            images={editImages}
            videoUrl={editVideoUrl}
            coverIndex={editCoverIndex}
            onImagesChange={setEditImages}
            onVideoChange={setEditVideoUrl}
            onCoverChange={setEditCoverIndex}
          />

          <div>
            <Label className="text-[10px]">Warranty</Label>
            <Input value={editData.warranty_info} onChange={e => setEditData(p => ({ ...p, warranty_info: e.target.value }))}
              className="mt-1 h-8 text-xs" placeholder="e.g. 2 year warranty" />
          </div>

          <div>
            <Label className="text-[10px]">SEO Title</Label>
            <Input value={editData.seo_title} onChange={e => setEditData(p => ({ ...p, seo_title: e.target.value }))}
              className="mt-1 h-8 text-xs" placeholder="Product SEO title" maxLength={60} />
          </div>

          <div>
            <Label className="text-[10px]">SEO Description</Label>
            <Textarea value={editData.seo_description} onChange={e => setEditData(p => ({ ...p, seo_description: e.target.value }))}
              className="mt-1 text-xs" rows={2} placeholder="Meta description" maxLength={160} />
          </div>

          <Button size="sm" className="w-full" onClick={() => {
            const coverUrl = editImages[editCoverIndex] || editImages[0] || null;
            const additionalUrls = editImages.filter((_, i) => i !== editCoverIndex);
            onSave?.({
              ...editData,
              photo_url: coverUrl,
              photo_urls: additionalUrls.length > 0 ? additionalUrls : null,
              video_url: editVideoUrl || null,
              weight_grams: editData.weight_grams ? Number(editData.weight_grams) : null,
            });
          }}>
            Save Advanced Details
          </Button>
        </CardContent>
      </Card>
    );
  }

  // DISPLAY MODE (buyer)
  return (
    <div className="space-y-4">
      {onClose && (
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs mb-1">
          <X className="h-3 w-3 mr-1" /> Close
        </Button>
      )}

      {/* Image Gallery */}
      {uniqueImages.length > 0 && (
        <div className="relative rounded-xl overflow-hidden bg-muted aspect-square">
          <img src={uniqueImages[currentImage]} alt={item.title} className="w-full h-full object-cover" />
          
          {uniqueImages.length > 1 && (
            <>
              <button onClick={() => setCurrentImage((currentImage - 1 + uniqueImages.length) % uniqueImages.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCurrentImage((currentImage + 1) % uniqueImages.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {uniqueImages.map((_, i) => (
                  <button key={i} onClick={() => setCurrentImage(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentImage ? "bg-primary" : "bg-background/60"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Thumbnails */}
      {uniqueImages.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {uniqueImages.map((img, i) => (
            <button key={i} onClick={() => setCurrentImage(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${i === currentImage ? "border-primary" : "border-transparent"}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Product info */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground">{item.title}</h2>
        
        <div className="flex items-center gap-2 flex-wrap">
          {item.brand_name && <Badge variant="outline" className="text-[10px]">{item.brand_name}</Badge>}
          {item.storefront_catalog_categories?.name && (
            <Badge variant="secondary" className="text-[10px]">{item.storefront_catalog_categories.name}</Badge>
          )}
          {item.sku && <span className="text-[9px] text-muted-foreground">SKU: {item.sku}</span>}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-primary">{fmt(item.price, item.currency)}</span>
          {item.compare_at_price && item.compare_at_price > item.price && (
            <span className="text-sm text-muted-foreground line-through">{fmt(item.compare_at_price, item.currency)}</span>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
        )}
      </div>

      {/* Video */}
      {item.video_url && (
        <Card>
          <CardContent className="p-3">
            <a href={item.video_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Play className="h-4 w-4" /> Watch product video
            </a>
          </CardContent>
        </Card>
      )}

      {/* Specifications */}
      {specs.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground">Specifications</h4>
            {specs.map((spec, i) => (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{spec.key}</span>
                <span className="font-medium">{spec.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Details chips */}
      <div className="flex flex-wrap gap-2">
        {item.weight_grams && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Ruler className="h-3 w-3" /> {item.weight_grams}g
          </Badge>
        )}
        {item.warranty_info && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Shield className="h-3 w-3" /> {item.warranty_info}
          </Badge>
        )}
        {item.track_inventory && item.stock_quantity != null && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Package className="h-3 w-3" /> {item.stock_quantity} in stock
          </Badge>
        )}
        {item.tags?.length > 0 && item.tags.map((tag: string) => (
          <Badge key={tag} variant="secondary" className="text-[9px] gap-0.5">
            <Tag className="h-2.5 w-2.5" /> {tag}
          </Badge>
        ))}
      </div>

      {/* Add to cart */}
      {onAddToCart && (
        <Button className="w-full h-12 font-semibold" onClick={() => onAddToCart(item.id, item.price)}>
          Add to Cart — {fmt(item.price, item.currency)}
        </Button>
      )}
    </div>
  );
}
