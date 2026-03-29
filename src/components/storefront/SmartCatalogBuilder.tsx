/**
 * SmartCatalogBuilder — Product creation with real media upload.
 * PASS GO LIVE 1: Replaced URL input with ProductMediaUploader.
 * AI-assisted title/description/tags still works.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as storefrontRepo from "@/repositories/storefront.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Loader2, Sparkles, Zap, Check, Tag } from "lucide-react";
import { toast } from "sonner";
import ProductMediaUploader from "./ProductMediaUploader";

interface Props {
  shopId: string;
  onCreated?: () => void;
}

interface AISuggestion {
  title: string;
  description: string;
  category: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
}

export default function SmartCatalogBuilder({ shopId, onCreated }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [itemType, setItemType] = useState("product");
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);

  // Media state
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [coverIndex, setCoverIndex] = useState(0);

  const handleAISuggest = async () => {
    if (!title.trim()) { toast.error("Enter a product name first"); return; }
    setAiLoading(true);
    try {
      const data = await storefrontRepo.invokeAIProxy({
        model: "google/gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: `You are an e-commerce product listing expert. Generate optimized listing data. Return ONLY valid JSON.
Product: "${title}" — ${description || "no description"}, Type: ${itemType}, Price: ${price || "not set"}

Return: {"title":"optimized product title","description":"compelling product description 2-3 sentences","category":"product category","tags":["tag1","tag2","tag3"],"seo_title":"SEO title under 60 chars","seo_description":"SEO meta under 155 chars"}`
        }],
      });
      const text = data?.choices?.[0]?.message?.content || data?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSuggestion(parsed);
        if (parsed.title && !title.includes(" ")) setTitle(parsed.title);
        if (parsed.description && !description) setDescription(parsed.description);
        toast.success("AI suggestions ready!");
      }
    } catch {
      toast.error("AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !price) { toast.error("Title and price are required"); return; }
    if (!user) return;
    setLoading(true);
    try {
      // Determine cover image (photo_url) and additional images (photo_urls)
      const coverUrl = images[coverIndex] || images[0] || null;
      const additionalUrls = images.filter((_, i) => i !== coverIndex);

      const { error } = await (supabase as any).from("catalog_items").insert({
        shop_id: shopId,
        user_id: user.id,
        title: title.trim(),
        description: suggestion?.description || description.trim() || null,
        price: parseFloat(price),
        item_type: itemType,
        photo_url: coverUrl,
        photo_urls: additionalUrls.length > 0 ? additionalUrls : null,
        video_url: videoUrl || null,
        available: true,
        tags: suggestion?.tags || [],
        seo_title: suggestion?.seo_title || title.trim(),
        seo_description: suggestion?.seo_description || description.trim() || null,
      });
      if (error) throw error;
      toast.success("Product created! 🎉");
      qc.invalidateQueries({ queryKey: ["my-catalog", shopId] });
      // Reset
      setTitle(""); setDescription(""); setPrice(""); setSuggestion(null);
      setImages([]); setVideoUrl(""); setCoverIndex(0);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-primary" />
          Smart Product Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Label className="text-[10px]">Product Name *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Margherita Pizza" className="h-8 text-xs mt-0.5" />
          </div>
          <div>
            <Label className="text-[10px]">Price *</Label>
            <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="h-8 text-xs mt-0.5" />
          </div>
          <div>
            <Label className="text-[10px]">Type</Label>
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-[10px]">Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your product..." className="text-xs mt-0.5" rows={2} />
        </div>

        {/* Real media upload replaces URL input */}
        <ProductMediaUploader
          images={images}
          videoUrl={videoUrl}
          coverIndex={coverIndex}
          onImagesChange={setImages}
          onVideoChange={setVideoUrl}
          onCoverChange={setCoverIndex}
        />

        {/* AI Suggest */}
        <Button variant="outline" size="sm" className="w-full h-8 text-[11px] gap-1.5" onClick={handleAISuggest} disabled={aiLoading || !title.trim()}>
          {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
          {aiLoading ? "Generating..." : "AI Auto-fill"}
        </Button>

        {suggestion && (
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
              <Zap className="h-2.5 w-2.5" /> AI Suggestions Applied
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[9px]">{suggestion.category}</Badge>
              {suggestion.tags.map(t => (
                <Badge key={t} variant="outline" className="text-[9px] gap-0.5"><Tag className="h-2 w-2" /> {t}</Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2">{suggestion.description}</p>
          </div>
        )}

        <Button className="w-full h-9 text-xs font-semibold gap-1.5" onClick={handleCreate} disabled={loading || !title.trim() || !price}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Add Product
        </Button>
      </CardContent>
    </Card>
  );
}
