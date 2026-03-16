/**
 * ShopSEOManager — Seller-facing SEO fields for storefront pages.
 * Manages: seo_title, seo_description, og_image_url.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Save, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

interface ShopSEOManagerProps {
  shopId: string;
  shopSlug: string;
  currentData: {
    seo_title?: string;
    seo_description?: string;
    og_image_url?: string;
    name?: string;
    description?: string;
    banner_url?: string;
  };
}

export default function ShopSEOManager({ shopId, shopSlug, currentData }: ShopSEOManagerProps) {
  const [seoTitle, setSeoTitle] = useState(currentData.seo_title || "");
  const [seoDesc, setSeoDesc] = useState(currentData.seo_description || "");
  const [ogImage, setOgImage] = useState(currentData.og_image_url || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSeoTitle(currentData.seo_title || "");
    setSeoDesc(currentData.seo_description || "");
    setOgImage(currentData.og_image_url || "");
  }, [currentData]);

  const previewTitle = seoTitle || `${currentData.name} | Shop`;
  const previewDesc = seoDesc || currentData.description || `Browse ${currentData.name}'s catalog`;
  const previewImage = ogImage || currentData.banner_url || "";

  const save = async () => {
    setSaving(true);
    try {
      await (supabase as any).from("storefront_pages").update({
        seo_title: seoTitle || null,
        seo_description: seoDesc || null,
        og_image_url: ogImage || null,
        updated_at: new Date().toISOString(),
      }).eq("id", shopId);
      toast.success("SEO settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" /> SEO Settings
      </h3>

      {/* Preview card */}
      <Card className="bg-muted/30">
        <CardContent className="p-3 space-y-1">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground font-medium">Search Preview</span>
          </div>
          <p className="text-sm font-medium text-primary line-clamp-1">{previewTitle}</p>
          <p className="text-[10px] text-emerald-700 truncate">{`easy-locs.lovable.app/s/${shopSlug}`}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{previewDesc}</p>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div>
            <Label className="text-[10px] flex items-center justify-between">
              Title
              <span className={`text-[9px] ${previewTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                {previewTitle.length}/60
              </span>
            </Label>
            <Input
              value={seoTitle}
              onChange={e => setSeoTitle(e.target.value)}
              placeholder={`${currentData.name} | Shop`}
              className="h-8 text-xs mt-1"
              maxLength={80}
            />
          </div>

          <div>
            <Label className="text-[10px] flex items-center justify-between">
              Description
              <span className={`text-[9px] ${previewDesc.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                {previewDesc.length}/160
              </span>
            </Label>
            <Textarea
              value={seoDesc}
              onChange={e => setSeoDesc(e.target.value)}
              placeholder={currentData.description || "Describe your shop..."}
              className="text-xs mt-1 min-h-[60px]"
              maxLength={200}
            />
          </div>

          <div>
            <Label className="text-[10px]">OG Image URL</Label>
            <Input
              value={ogImage}
              onChange={e => setOgImage(e.target.value)}
              placeholder={currentData.banner_url || "https://..."}
              className="h-8 text-xs mt-1"
            />
            {previewImage && (
              <img src={previewImage} alt="OG Preview" className="mt-2 rounded h-20 w-full object-cover" />
            )}
          </div>

          <Button size="sm" className="w-full text-xs" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save SEO Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
