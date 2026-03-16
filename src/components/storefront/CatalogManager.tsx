/**
 * CatalogManager — Seller-facing catalog editor.
 * Add/edit products and services with photos, pricing, categories.
 */
import { useState } from "react";
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
import { Plus, Edit2, Trash2, Package, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

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

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [itemType, setItemType] = useState("product");
  const [photoUrl, setPhotoUrl] = useState("");
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
    setItemType("product"); setPhotoUrl(""); setAvailable(true);
    setCategoryId(""); setEditingItem(null);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setComparePrice(item.compare_at_price ? String(item.compare_at_price) : "");
    setItemType(item.item_type || "product");
    setPhotoUrl(item.photo_url || "");
    setAvailable(item.available);
    setCategoryId(item.category_id || "");
    setDialogOpen(true);
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
        photo_url: photoUrl.trim() || null,
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
          <DialogContent className="max-w-md">
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
              <div>
                <Label className="text-xs">Photo URL</Label>
                <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} className="mt-1" placeholder="https://..." />
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
          {items.map((item: any) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-3 flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                {item.photo_url && (
                  <img src={item.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
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
          ))}
        </div>
      )}
    </div>
  );
}
