/**
 * CatalogManager — Seller-facing catalog editor.
 * Real file upload (multiple images + video), instant preview.
 */
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Package, Loader2, GripVertical, Upload, X, Video, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { isVideoFile, isVideoUrl, validateMediaFile, MEDIA_ACCEPT } from "@/lib/media-utils";

interface CatalogManagerProps {
  shopId: string;
}

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function CatalogManager({ shopId }: CatalogManagerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [itemType, setItemType] = useState("product");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [available, setAvailable] = useState(true);
  const [categoryId, setCategoryId] = useState<string>("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-catalog", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("catalog_items")
        .select("*, storefront_catalog_categories(name)")
        .eq("shop_id", shopId)
        .order("sort_order");
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["my-categories", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_catalog_categories")
        .select("*")
        .eq("shop_id", shopId)
        .order("sort_order");
      return data || [];
    },
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setPrice(""); setComparePrice("");
    setItemType("product"); setPhotoUrls([]); setVideoUrl(""); setAvailable(true);
    setCategoryId(""); setEditingItem(null);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setComparePrice(item.compare_at_price ? String(item.compare_at_price) : "");
    setItemType(item.item_type || "product");
    // Support both legacy photo_url and new photo_urls array
    const urls: string[] = [];
    if (item.photo_urls && Array.isArray(item.photo_urls)) {
      urls.push(...item.photo_urls);
    } else if (item.photo_url) {
      urls.push(item.photo_url);
    }
    setPhotoUrls(urls);
    setVideoUrl(item.video_url || "");
    setAvailable(item.available);
    setCategoryId(item.category_id || "");
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const validationError = validateMediaFile(file);
      if (validationError) { toast.error(validationError); continue; }

      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${shopId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("catalog-photos").upload(path, file);
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data: urlData } = supabase.storage.from("catalog-photos").getPublicUrl(path);

      if (isVideoFile(file)) {
        setVideoUrl(urlData.publicUrl);
      } else {
        newUrls.push(urlData.publicUrl);
      }
    }

    if (newUrls.length > 0) {
      setPhotoUrls(prev => [...prev, ...newUrls]);
    }
    toast.success(`${newUrls.length + (videoUrl ? 1 : 0)} media uploaded`);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const payload = {
        shop_id: shopId,
        user_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        compare_at_price: parseFloat(comparePrice) || null,
        item_type: itemType,
        photo_url: photoUrls[0] || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        video_url: videoUrl || null,
        available,
        category_id: categoryId || null,
      };

      if (editingItem) {
        await (supabase as any).from("catalog_items").update(payload).eq("id", editingItem.id);
        toast.success("Item updated");
      } else {
        await (supabase as any).from("catalog_items").insert(payload);
        toast.success("Item added");
      }

      qc.invalidateQueries({ queryKey: ["my-catalog", shopId] });
      setDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("catalog_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-catalog", shopId] });
    toast.success("Item removed");
  };

  const handleToggle = async (id: string, val: boolean) => {
    await (supabase as any).from("catalog_items").update({ available: val }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-catalog", shopId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Catalog ({items.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Price</Label>
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Compare Price</Label>
                  <Input type="number" value={comparePrice} onChange={e => setComparePrice(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={itemType} onValueChange={setItemType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {categories.length > 0 && (
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Media Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Photos & Video</Label>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors font-medium"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </button>
                  <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} multiple onChange={handleFileUpload} className="hidden" />
                </div>

                {photoUrls.length === 0 && !videoUrl ? (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
                  >
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
                    <p className="text-xs text-muted-foreground">Click to upload photos or videos</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP, MP4, WebM</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {photoUrls.map((url, i) => (
                      <div key={`${url}-${i}`} className="relative group rounded-lg overflow-hidden aspect-square bg-muted">
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 bg-accent text-accent-foreground text-[8px] font-bold px-1 py-0.5 rounded">Cover</span>
                        )}
                      </div>
                    ))}
                    {videoUrl && (
                      <div className="relative group rounded-lg overflow-hidden aspect-square bg-muted">
                        <video src={videoUrl} className="w-full h-full object-cover" muted preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Video className="h-5 w-5 text-white drop-shadow-lg" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setVideoUrl("")}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {/* Add more button */}
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="rounded-lg border-2 border-dashed border-border aspect-square flex items-center justify-center cursor-pointer hover:border-accent/50 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={available} onCheckedChange={setAvailable} />
                <Label className="text-xs">Available</Label>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingItem ? "Update" : "Add"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          No items yet. Add your first product or service!
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const thumbUrl = item.photo_url || (item.photo_urls && item.photo_urls[0]);
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-3 flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  {thumbUrl ? (
                    <img src={thumbUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-primary">{fmtPrice(item.price)}</span>
                      <Badge variant={item.available ? "secondary" : "outline"} className="text-[9px]">
                        {item.available ? "Active" : "Hidden"}
                      </Badge>
                      {item.storefront_catalog_categories?.name && (
                        <Badge variant="outline" className="text-[9px]">{item.storefront_catalog_categories.name}</Badge>
                      )}
                      {item.video_url && <Video className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Switch
                      checked={item.available}
                      onCheckedChange={(v) => handleToggle(item.id, v)}
                      className="scale-75"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
