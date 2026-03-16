/**
 * DigitalProducts — ORBIT V1: Digital product sales & downloads.
 * Seller: upload digital products, manage licenses, track downloads.
 * Buyer: browse, purchase, download with license keys.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Plus, Loader2, Key, Download, Eye, ShoppingCart, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; mode?: "seller" | "buyer"; }

const PRODUCT_TYPES = [
  { value: "download", label: "📦 Download" },
  { value: "ebook", label: "📚 E-Book" },
  { value: "course", label: "🎓 Course" },
  { value: "software", label: "💾 Software" },
  { value: "template", label: "📋 Template" },
  { value: "music", label: "🎵 Music" },
  { value: "license", label: "🔑 License Key" },
];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function DigitalProducts({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", product_type: "download", file_url: "", preview_url: "", download_limit: "5" });
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["digital-products", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_digital_products")
        .select("*").eq("shop_id", shopId).eq("active", true).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["digital-purchases", shopId, user?.id, mode],
    queryFn: async () => {
      if (!user) return [];
      const q = (supabase as any).from("storefront_digital_purchases").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q.eq("buyer_id", user.id);
      const { data } = await q.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createProduct = async () => {
    if (!user || !form.title || !form.price) return;
    setSaving(true);
    try {
      await (supabase as any).from("storefront_digital_products").insert({
        shop_id: shopId, user_id: user.id, title: form.title, description: form.description || null,
        price: parseFloat(form.price), product_type: form.product_type,
        file_url: form.file_url || null, preview_url: form.preview_url || null,
        download_limit: parseInt(form.download_limit) || 5,
      });
      qc.invalidateQueries({ queryKey: ["digital-products", shopId] });
      setForm({ title: "", description: "", price: "", product_type: "download", file_url: "", preview_url: "", download_limit: "5" });
      setCreating(false);
      toast.success("Product created");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const purchaseProduct = async (productId: string) => {
    if (!user) return;
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;

    await (supabase as any).from("storefront_digital_purchases").insert({
      product_id: productId, buyer_id: user.id, shop_id: shopId,
      max_downloads: product.download_limit || 5,
    });

    await (supabase as any).from("storefront_digital_products").update({
      total_sales: (product.total_sales || 0) + 1, updated_at: new Date().toISOString(),
    }).eq("id", productId);

    qc.invalidateQueries({ queryKey: ["digital-purchases", shopId, user?.id, mode] });
    qc.invalidateQueries({ queryKey: ["digital-products", shopId] });
    toast.success("Purchased! Check your library.");
  };

  const downloadFile = async (purchase: any) => {
    const product = products.find((p: any) => p.id === purchase.product_id);
    if (!product?.file_url) { toast.error("No file available"); return; }
    if (purchase.download_count >= purchase.max_downloads) { toast.error("Download limit reached"); return; }

    await (supabase as any).from("storefront_digital_purchases").update({
      download_count: (purchase.download_count || 0) + 1,
    }).eq("id", purchase.id);

    window.open(product.file_url, "_blank");
    qc.invalidateQueries({ queryKey: ["digital-purchases", shopId, user?.id, mode] });
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const purchasedIds = new Set(purchases.map((p: any) => p.product_id));

  if (mode === "buyer") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileDown className="h-4 w-4 text-primary" /> Digital Products
        </h3>

        {/* Product catalog */}
        {products.map((p: any) => {
          const owned = purchasedIds.has(p.id);
          const myPurchase = purchases.find((pu: any) => pu.product_id === p.id);
          const typeInfo = PRODUCT_TYPES.find(t => t.value === p.product_type);

          return (
            <Card key={p.id} className={owned ? "border-primary/20" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold">{p.title}</h4>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">{typeInfo?.label || p.product_type}</Badge>
                  </div>
                  <span className="text-lg font-bold text-primary">{fmtPrice(p.price, p.currency)}</span>
                </div>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}

                {owned && myPurchase ? (
                  <div className="space-y-2 bg-primary/5 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary/10 text-primary text-[10px]">Owned</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {myPurchase.download_count}/{myPurchase.max_downloads} downloads
                      </span>
                    </div>
                    {myPurchase.license_key && (
                      <div className="flex items-center gap-2">
                        <Key className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[10px] font-mono">{myPurchase.license_key}</span>
                        <button onClick={() => copyKey(myPurchase.license_key)}>
                          {copiedKey === myPurchase.license_key ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                        </button>
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1"
                      onClick={() => downloadFile(myPurchase)}
                      disabled={myPurchase.download_count >= myPurchase.max_downloads}>
                      <Download className="h-3 w-3" /> Download
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {p.preview_url && (
                      <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => window.open(p.preview_url, "_blank")}>
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                    )}
                    <Button size="sm" className="flex-1 text-xs gap-1" onClick={() => purchaseProduct(p.id)}>
                      <ShoppingCart className="h-3 w-3" /> Buy Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {products.length === 0 && <p className="text-xs text-muted-foreground">No digital products available.</p>}
      </div>
    );
  }

  // Seller mode
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileDown className="h-4 w-4 text-primary" /> Digital Products
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCreating(!creating)}>
          <Plus className="h-3 w-3" /> New Product
        </Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Price</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.product_type} onValueChange={v => setForm({ ...form, product_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">File URL</Label>
              <Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Preview URL (optional)</Label>
              <Input value={form.preview_url} onChange={e => setForm({ ...form, preview_url: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Max Downloads per Purchase</Label>
              <Input type="number" value={form.download_limit} onChange={e => setForm({ ...form, download_limit: e.target.value })} className="mt-1" />
            </div>
            <Button size="sm" className="w-full" onClick={createProduct} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create Product"}
            </Button>
          </CardContent>
        </Card>
      )}

      {products.map((p: any) => {
        const salesCount = purchases.filter((pu: any) => pu.product_id === p.id).length;
        return (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <FileDown className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-[10px] text-muted-foreground">{fmtPrice(p.price, p.currency)} · {p.total_sales || 0} sales</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{PRODUCT_TYPES.find(t => t.value === p.product_type)?.label}</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
