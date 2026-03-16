/**
 * MyShopPage — Seller dashboard for managing their storefront.
 * Tabs: Catalog, Orders, Deals, Analytics, Launch, Settings
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ShopCreator from "@/components/storefront/ShopCreator";
import CatalogManager from "@/components/storefront/CatalogManager";
import OrdersManager from "@/components/storefront/OrdersManager";
import StorefrontDealRoom from "@/components/storefront/StorefrontDealRoom";
import ShopAnalytics from "@/components/storefront/ShopAnalytics";
import LaunchAudit from "@/components/storefront/LaunchAudit";
import ShopShareEngine from "@/components/storefront/ShopShareEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Package, ShoppingBag, Settings, ExternalLink, Copy, Check, Loader2, Handshake, BarChart3, Rocket } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

const TABS = [
  { id: "catalog", label: "Catalog", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "deals", label: "Deals", icon: Handshake },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "launch", label: "Launch", icon: Rocket },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type TabId = typeof TABS[number]["id"];

export default function MyShopPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("catalog");
  const [copied, setCopied] = useState(false);

  const { data: shop, isLoading, refetch } = useQuery({
    queryKey: ["my-storefront", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const shopUrl = shop ? `${window.location.origin}/s/${shop.slug}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const updateShop = async (field: string, value: any) => {
    if (!shop) return;
    await (supabase as any).from("storefront_pages").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", shop.id);
    refetch();
    toast.success("Updated");
  };

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </DashboardLayout>
  );

  // No shop yet — show creator
  if (!shop) return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ShopCreator />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-6">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{shop.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{shop.shop_visibility}</Badge>
                <button onClick={copyLink} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <a href={`/s/${shop.slug}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3 inline" /> Preview
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); haptic("selection"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0"
                style={{
                  background: active ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.5)",
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: `1px solid ${active ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
                }}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="px-4">
          {tab === "catalog" && <CatalogManager shopId={shop.id} />}
          {tab === "orders" && <OrdersManager shopId={shop.id} />}
          {tab === "settings" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Shop Details</h4>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      defaultValue={shop.name}
                      onBlur={e => { if (e.target.value !== shop.name) updateShop("name", e.target.value); }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tagline</Label>
                    <Input
                      defaultValue={shop.tagline || ""}
                      onBlur={e => updateShop("tagline", e.target.value || null)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      defaultValue={shop.description || ""}
                      onBlur={e => updateShop("description", e.target.value || null)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Visibility</Label>
                    <Select value={shop.shop_visibility} onValueChange={v => updateShop("shop_visibility", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">🌐 Public</SelectItem>
                        <SelectItem value="unlisted">🔗 Unlisted</SelectItem>
                        <SelectItem value="private">🔒 Private</SelectItem>
                        <SelectItem value="draft">📝 Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Contact</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        defaultValue={shop.contact_phone || ""}
                        onBlur={e => updateShop("contact_phone", e.target.value || null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">WhatsApp</Label>
                      <Input
                        defaultValue={shop.contact_whatsapp || ""}
                        onBlur={e => updateShop("contact_whatsapp", e.target.value || null)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Telegram</Label>
                      <Input
                        defaultValue={shop.contact_telegram || ""}
                        onBlur={e => updateShop("contact_telegram", e.target.value || null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input
                        defaultValue={shop.contact_email || ""}
                        onBlur={e => updateShop("contact_email", e.target.value || null)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Branding</h4>
                  <div>
                    <Label className="text-xs">Logo URL</Label>
                    <Input
                      defaultValue={shop.logo_url || ""}
                      onBlur={e => updateShop("logo_url", e.target.value || null)}
                      className="mt-1"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Banner URL</Label>
                    <Input
                      defaultValue={shop.banner_url || ""}
                      onBlur={e => updateShop("banner_url", e.target.value || null)}
                      className="mt-1"
                      placeholder="https://..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Location</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        defaultValue={shop.city || ""}
                        onBlur={e => updateShop("city", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Country</Label>
                      <Input
                        defaultValue={shop.country || ""}
                        onBlur={e => updateShop("country", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Geo Scope</Label>
                    <Select value={shop.geo_scope || "city"} onValueChange={v => updateShop("geo_scope", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="worldwide">🌍 Worldwide</SelectItem>
                        <SelectItem value="country">🏳️ Country</SelectItem>
                        <SelectItem value="city">🏙️ City</SelectItem>
                        <SelectItem value="radius">📍 Radius</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
