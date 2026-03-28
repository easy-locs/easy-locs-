/**
 * SmartNotifications — Event-based notification preferences & log
 * Seller: view notification log, configure shop defaults
 * Buyer: manage notification preferences per shop
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff, Mail, Smartphone, Loader2, Clock, CheckCircle, Eye } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const EVENT_LABELS: Record<string, string> = {
  order_placed: "🛒 New Order",
  order_shipped: "📦 Shipped",
  order_delivered: "✅ Delivered",
  payment_received: "💰 Payment",
  review_posted: "⭐ Review",
  promotion_started: "🎉 Promotion",
  live_started: "📺 Live Started",
  deal_update: "🤝 Deal Update",
};

export default function SmartNotifications({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Load preferences
  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notif-prefs", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_notification_preferences")
        .select("*").eq("shop_id", shopId).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Load notification log
  const { data: logs = [] } = useQuery({
    queryKey: ["notif-log", shopId, mode, user?.id],
    queryFn: async () => {
      const query = (supabase as any).from("storefront_notification_log")
        .select("*").eq("shop_id", shopId).order("sent_at", { ascending: false }).limit(30);
      if (mode === "buyer") query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  // Upsert preferences
  const updatePrefs = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (prefs) {
        await (supabase as any).from("storefront_notification_preferences")
          .update({ ...updates, updated_at: new Date().toISOString() }).eq("id", prefs.id);
      } else {
        await (supabase as any).from("storefront_notification_preferences")
          .insert({ shop_id: shopId, user_id: user!.id, ...updates });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notif-prefs"] }); toast.success("Preferences saved"); },
  });

  const togglePref = (key: string, value: boolean) => updatePrefs.mutate({ [key]: value });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  const currentPrefs = prefs || {
    notify_orders: true, notify_shipping: true, notify_promotions: true,
    notify_reviews: true, notify_deals: false, notify_live: true,
    channel_email: true, channel_push: true, channel_sms: false,
    digest_frequency: "instant",
  };

  const prefItems = [
    { key: "notify_orders", label: "Orders", icon: "🛒" },
    { key: "notify_shipping", label: "Shipping", icon: "📦" },
    { key: "notify_promotions", label: "Promotions", icon: "🎉" },
    { key: "notify_reviews", label: "Reviews", icon: "⭐" },
    { key: "notify_deals", label: "Deals", icon: "🤝" },
    { key: "notify_live", label: "Live Events", icon: "📺" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" /> Notifications
      </h3>

      {/* Preferences */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground">Notification Preferences</h4>
          
          <div className="space-y-2">
            {prefItems.map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-xs">{item.icon} {item.label}</span>
                <Switch
                  checked={currentPrefs[item.key]}
                  onCheckedChange={v => togglePref(item.key, v)}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <h5 className="text-[10px] font-semibold text-muted-foreground uppercase">Channels</h5>
            <div className="flex items-center justify-between">
              <span className="text-xs flex items-center gap-1"><Smartphone className="h-3 w-3" /> Push</span>
              <Switch checked={currentPrefs.channel_push} onCheckedChange={v => togglePref("channel_push", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
              <Switch checked={currentPrefs.channel_email} onCheckedChange={v => togglePref("channel_email", v)} />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Digest</span>
              <Select value={currentPrefs.digest_frequency} onValueChange={v => updatePrefs.mutate({ digest_frequency: v })}>
                <SelectTrigger className="w-24 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant" className="text-xs">Instant</SelectItem>
                  <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                  <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                  <SelectItem value="off" className="text-xs">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Log */}
      {logs.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> Recent ({logs.length})
            </h4>
            {logs.slice(0, 10).map((log: any) => (
              <div key={log.id} className={`flex items-start gap-2 p-1.5 rounded text-[11px] ${log.read_at ? "opacity-60" : ""}`}>
                <span className="shrink-0">{EVENT_LABELS[log.event_type]?.slice(0, 2) || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-2 break-words leading-snug">{log.title}</p>
                  {log.body && <p className="text-[9px] text-muted-foreground line-clamp-2 break-words leading-snug">{log.body}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="secondary" className="text-[7px]">{log.channel}</Badge>
                  {log.read_at && <CheckCircle className="h-2.5 w-2.5 text-success" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
