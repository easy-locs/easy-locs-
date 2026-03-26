import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { updateMerchantInfo, setMerchantOpenStatus, activateMerchant } from "@/lib/merchant/claim-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Store, Utensils, Zap, Eye, Plus, Trash2, Edit2, Check, Loader2, ExternalLink, ScanLine, ShoppingCart, CreditCard, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routes } from "@/lib/routes";
import { MerchantLiveFulfillmentPanel } from "@/components/merchant/MerchantLiveFulfillmentPanel";
import MerchantFinancialWidgets from "@/components/merchant/MerchantFinancialWidgets";
import MerchantPaymentHistory from "@/components/merchant/MerchantPaymentHistory";
import MerchantQrCockpit from "@/components/merchant/MerchantQrCockpit";

interface MenuItem {
  id: string;
  name: string;
  name_ar?: string | null;
  price: number | null;
  is_available: boolean;
  description?: string;
  description_ar?: string | null;
  isNew?: boolean;
}

/* ═══ Merchant Operations Hub ═══ */
function MerchantOpsHub({ profileId }: { profileId: string | null }) {
  const nav = useNavigate();
  const OPS = [
    { icon: ScanLine, label: "POS / Cashier", desc: "Tactile point of sale", onClick: () => nav(routes.merchantPos() + (profileId ? `?id=${profileId}` : "")) },
    { icon: QrCode, label: "QR Menu", desc: "Dynamic menu QR codes", onClick: () => nav(`/qr/entry/create?context=merchant&merchant_id=${profileId || ""}`) },
    { icon: ShoppingCart, label: "Online Orders", desc: "Incoming orders", onClick: () => nav(routes.merchantKitchen() + (profileId ? `?id=${profileId}` : "")) },
    { icon: CreditCard, label: "Payments", desc: "Transaction history", onClick: () => nav("/wallet/hub") },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {OPS.map((op) => (
        <button key={op.label} onClick={op.onClick} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left active:scale-[0.97] transition-transform min-h-[56px]">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
            <op.icon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{op.label}</p>
            <p className="text-[10px] text-muted-foreground truncate">{op.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function MerchantDashboardPage() {
  const [params] = useSearchParams();
  const profileId = params.get("id");

  const [merchant, setMerchant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [storefrontSlug, setStorefrontSlug] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(true);

  // Editable fields
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    (async () => {
      const { data: m } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();
      if (m) {
        setMerchant(m);
        setName(m.merchant_name || "");
        setNameAr(m.name_ar || "");
        setPhone(m.phone || "");
        setArea(m.area || "");
        setCuisine(m.cuisine_type || "");
      }

      const { data: items } = await (supabase as any)
        .from("menu_items")
        .select("id, name, name_ar, price, is_available, description, description_ar")
        .eq("merchant_profile_id", profileId)
        .order("sort_order");
      if (items) {
        setMenuItems(items);
        // Check if any items have prices
        setShowPrices(items.some((i: any) => i.price != null));
      }

      // Get storefront slug
      const { data: shop } = await (supabase as any)
        .from("storefront_pages")
        .select("slug, active, shop_visibility")
        .eq("merchant_profile_id", profileId)
        .maybeSingle();
      if (shop) {
        setStorefrontSlug(shop.slug);
        setIsOpen(shop.active && shop.shop_visibility === "public");
      }

      setLoading(false);
    })();
  }, [profileId]);

  const saveInfo = useCallback(async () => {
    if (!profileId) return;
    setSaving(true);
    try {
      await updateMerchantInfo(profileId, {
        merchant_name: name,
        name_ar: nameAr || undefined,
        phone,
        area,
        cuisine_type: cuisine,
      });
      toast.success("Info saved");
    } catch { toast.error("Save failed"); }
    setSaving(false);
  }, [profileId, name, nameAr, phone, area, cuisine]);

  const triggerAutoTranslate = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const { data } = await supabase.functions.invoke("translate-message", {
        body: { text: name, from_locale: "en", to_locale: "ar" },
      });
      if (data?.translated) {
        setNameAr(data.translated);
        toast.success("Arabic name generated");
      }
    } catch { toast.error("Translation failed"); }
    setSaving(false);
  };

  const toggleOpen = async (val: boolean) => {
    if (!profileId) return;
    setIsOpen(val);
    await setMerchantOpenStatus(profileId, val);
    toast.success(val ? "Store is now OPEN" : "Store is now CLOSED");
  };

  const handleActivate = async () => {
    if (!profileId) return;
    setSaving(true);
    try {
      await activateMerchant(profileId);
      setMerchant((m: any) => ({ ...m, onboarding_status: "active" }));
      setIsOpen(true);
      toast.success("Your restaurant is now live! 🎉");
    } catch { toast.error("Activation failed"); }
    setSaving(false);
  };

  const addItem = () => {
    setMenuItems((prev) => [...prev, {
      id: `new-${Date.now()}`,
      name: "New Item",
      price: showPrices ? 20 : null,
      is_available: true,
      isNew: true,
    }]);
  };

  const removeItem = async (id: string) => {
    if (!id.startsWith("new-")) {
      await (supabase as any).from("menu_items").delete().eq("id", id);
    }
    setMenuItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const saveMenu = async () => {
    if (!profileId) return;
    setSaving(true);
    try {
      for (const item of menuItems) {
        const payload = {
          merchant_profile_id: profileId,
          name: item.name,
          name_ar: item.name_ar ?? null,
          price: showPrices ? item.price : null,
          is_available: item.is_available,
          sort_order: menuItems.indexOf(item),
        };
        if (item.isNew) {
          await (supabase as any).from("menu_items").insert(payload);
        } else {
          await (supabase as any).from("menu_items").update(payload).eq("id", item.id);
        }
      }
      toast.success("Menu saved");
    } catch { toast.error("Menu save failed"); }
    setSaving(false);
  };

  const autoTranslateMenu = async () => {
    setSaving(true);
    for (const item of menuItems) {
      if (item.name && !item.name_ar) {
        try {
          const { data } = await supabase.functions.invoke("translate-message", {
            body: { text: item.name, from_locale: "en", to_locale: "ar" },
          });
          if (data?.translated) {
            updateItem(item.id, "name_ar", data.translated);
          }
        } catch { /* skip */ }
      }
    }
    setSaving(false);
    toast.success("Arabic translations generated");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Store className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-bold">No restaurant selected</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColor = merchant.onboarding_status === "active" ? "default" : "secondary";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{merchant.merchant_name}</h1>
            {merchant.name_ar && <p className="text-xs text-muted-foreground truncate" dir="rtl">{merchant.name_ar}</p>}
            <Badge variant={statusColor} className="text-[10px]">{merchant.onboarding_status}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{isOpen ? "OPEN" : "CLOSED"}</span>
              <Switch checked={isOpen} onCheckedChange={toggleOpen} />
            </div>
            {storefrontSlug && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/#/store/${storefrontSlug}`} target="_blank" rel="noopener">
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Activation Banner */}
        {merchant.onboarding_status === "claimed" && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Ready to go live?</p>
                <p className="text-xs text-muted-foreground">Complete your setup and activate your storefront</p>
              </div>
              <Button onClick={handleActivate} disabled={saving} size="sm">
                <Zap className="h-3.5 w-3.5 mr-1" /> Activate
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ Merchant Operations Hub ═══ */}
        <MerchantOpsHub profileId={profileId} />

        {/* Live Fulfillment + Financial Widgets */}
        {profileId && (
          <div className="space-y-3 mb-4">
            <MerchantLiveFulfillmentPanel merchantProfileId={profileId} />
            <MerchantFinancialWidgets merchantProfileId={profileId} />
            <MerchantQrCockpit merchantProfileId={profileId} storefrontPageId={null} />
          </div>
        )}

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="details" className="text-xs"><Store className="h-3.5 w-3.5 mr-1" /> Details</TabsTrigger>
            <TabsTrigger value="menu" className="text-xs"><Utensils className="h-3.5 w-3.5 mr-1" /> Menu</TabsTrigger>
            <TabsTrigger value="status" className="text-xs"><Zap className="h-3.5 w-3.5 mr-1" /> Status</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs"><Eye className="h-3.5 w-3.5 mr-1" /> Preview</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader><CardTitle className="text-base">Restaurant Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Name (English)"><Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" /></Field>
                <Field label="Name (Arabic)">
                  <div className="flex gap-2">
                    <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="h-10 flex-1" dir="rtl" placeholder="الاسم بالعربية" />
                    <Button variant="outline" size="sm" onClick={triggerAutoTranslate} disabled={saving} className="shrink-0">
                      Auto ✨
                    </Button>
                  </div>
                </Field>
                <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="h-10" /></Field>
                <Field label="Area"><Input value={area} onChange={(e) => setArea(e.target.value)} className="h-10" /></Field>
                <Field label="Cuisine"><Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="h-10" /></Field>
                <Button onClick={saveInfo} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Menu Items ({menuItems.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={autoTranslateMenu} disabled={saving}>🌐 AR</Button>
                    <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
                  </div>
                </div>
                {/* Price toggle */}
                <div className="flex items-center gap-2 mt-2">
                  <Switch checked={showPrices} onCheckedChange={setShowPrices} />
                  <span className="text-xs text-muted-foreground">
                    {showPrices ? "Show prices" : "Add prices later"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[50vh] overflow-auto">
                {menuItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                    <div className="flex-1 min-w-0">
                      {editId === item.id ? (
                        <div className="space-y-1.5">
                          <Input value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} className="h-8 text-sm" placeholder="Name (EN)" />
                          <Input value={item.name_ar || ""} onChange={(e) => updateItem(item.id, "name_ar", e.target.value)} className="h-8 text-sm" dir="rtl" placeholder="الاسم بالعربية" />
                          {showPrices && (
                            <Input type="number" value={item.price ?? ""} onChange={(e) => updateItem(item.id, "price", e.target.value ? Number(e.target.value) : null)} className="h-8 text-sm w-24" placeholder="Price" />
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          {item.name_ar && <span className="text-xs text-muted-foreground ml-2" dir="rtl">{item.name_ar}</span>}
                          {showPrices && item.price != null && (
                            <span className="text-xs text-primary font-semibold ml-2">{item.price} AED</span>
                          )}
                          {showPrices && item.price == null && (
                            <span className="text-xs text-muted-foreground ml-2">No price</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setEditId(editId === item.id ? null : item.id)} className="text-muted-foreground hover:text-foreground">
                      {editId === item.id ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                    </button>
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button onClick={saveMenu} disabled={saving} className="w-full mt-3">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Menu"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status">
            <Card>
              <CardHeader><CardTitle className="text-base">Activation Status</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {["imported_not_claimed", "claimed", "info_confirmed", "menu_confirmed", "payment_configured", "active"].map((s, i) => {
                  const statuses = ["imported_not_claimed", "claimed", "info_confirmed", "menu_confirmed", "payment_configured", "active"];
                  const currentIdx = statuses.indexOf(merchant.onboarding_status);
                  const done = i <= currentIdx;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {done ? "✓" : i + 1}
                      </div>
                      <span className={`text-sm ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <Card>
              <CardHeader><CardTitle className="text-base">Storefront Preview</CardTitle></CardHeader>
              <CardContent>
                {storefrontSlug ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border p-4 space-y-2">
                      <h3 className="text-lg font-bold text-foreground">{name}</h3>
                      {nameAr && <p className="text-sm text-muted-foreground" dir="rtl">{nameAr}</p>}
                      <Badge variant="secondary">{cuisine}</Badge>
                      <p className="text-sm text-muted-foreground">{area}</p>
                    </div>
                    <div className="space-y-1.5">
                      {menuItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm border-b border-border pb-1.5">
                          <div>
                            <span className="text-foreground">{item.name}</span>
                            {item.name_ar && <span className="text-xs text-muted-foreground ml-2" dir="rtl">{item.name_ar}</span>}
                          </div>
                          {item.price != null && <span className="text-primary font-semibold">{item.price} AED</span>}
                        </div>
                      ))}
                      {menuItems.length > 5 && <p className="text-xs text-muted-foreground">+{menuItems.length - 5} more items</p>}
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={`/#/store/${storefrontSlug}`} target="_blank" rel="noopener">
                        <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open Full Storefront
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No storefront page linked yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}
