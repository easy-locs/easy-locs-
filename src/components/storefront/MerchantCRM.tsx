/**
 * MerchantCRM — PASS132: Merchant CRM Light.
 * Auto customer tracking from orders, segments, simple actions.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Crown, RotateCcw, UserMinus, UserPlus, Search,
  MessageSquare, Tag, Gift, Loader2, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";

const SEGMENTS = [
  { key: "all", label: "All", icon: Users, color: "text-foreground" },
  { key: "new", label: "New", icon: UserPlus, color: "text-info" },
  { key: "repeat", label: "Repeat", icon: RotateCcw, color: "text-primary" },
  { key: "vip", label: "VIP", icon: Crown, color: "text-warning" },
  { key: "inactive", label: "Inactive", icon: UserMinus, color: "text-muted-foreground" },
] as const;

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n); }
  catch { return `${n}`; }
};

interface Props {
  shopId: string;
}

export default function MerchantCRM({ shopId }: Props) {
  const [segment, setSegment] = useState<string>("all");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["crm-customers", shopId, segment],
    queryFn: async () => {
      let q = (supabase as any)
        .from("storefront_crm_customers")
        .select("*")
        .eq("shop_id", shopId)
        .order("total_spent", { ascending: false })
        .limit(100);

      if (segment !== "all") q = q.eq("segment", segment);
      const { data } = await q;
      return data || [];
    },
    enabled: !!shopId,
  });

  const filtered = (customers || []).filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.buyer_name?.toLowerCase().includes(s) ||
      c.buyer_email?.toLowerCase().includes(s) ||
      c.buyer_phone?.includes(s)
    );
  });

  const segmentCounts = (customers || []).reduce((acc: Record<string, number>, c: any) => {
    acc[c.segment] = (acc[c.segment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sendOffer = async (customer: any) => {
    // Emit event for notification system
    platformBus.emit("storefront:deal_accepted", {
      dealId: `offer-${Date.now()}`,
      shopId,
      buyerId: customer.buyer_id,
      buyerEmail: customer.buyer_email,
    }, "marketplace");
    toast.success(`Offer sent to ${customer.buyer_name || customer.buyer_email}`);
  };

  const sendMessage = async (customer: any) => {
    // Navigate to communication with pre-filled context
    toast.info(`Opening chat with ${customer.buyer_name || customer.buyer_email}`);
  };

  const segmentBadge = (seg: string) => {
    const colors: Record<string, string> = {
      new: "bg-info/10 text-info border-info/20",
      repeat: "bg-primary/10 text-primary border-primary/20",
      vip: "bg-warning/10 text-warning border-warning/20",
      inactive: "bg-muted text-muted-foreground border-border",
    };
    return colors[seg] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" /> Customers
        </h3>
        <Badge variant="outline" className="text-[9px]">
          {(customers || []).length} total
        </Badge>
      </div>

      {/* Segment filter pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all shrink-0 border ${
              segment === s.key
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
            }`}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
            {s.key !== "all" && segmentCounts[s.key] ? (
              <span className="ml-0.5 text-[8px] opacity-60">({segmentCounts[s.key]})</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {isLoading ? (
        <div className="py-6 text-center">
          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              {segment === "all" ? "No customers yet — they'll appear automatically when orders come in." : `No ${segment} customers.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <CustomerRow
              key={c.id}
              customer={c}
              segmentBadge={segmentBadge}
              onSendOffer={sendOffer}
              onSendMessage={sendMessage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerRow({
  customer: c,
  segmentBadge,
  onSendOffer,
  onSendMessage,
}: {
  customer: any;
  segmentBadge: (s: string) => string;
  onSendOffer: (c: any) => void;
  onSendMessage: (c: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="p-3">
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
              {(c.buyer_name || c.buyer_email || "?")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{c.buyer_name || c.buyer_email || "Anonymous"}</p>
              <p className="text-[9px] text-muted-foreground truncate">{c.buyer_email}</p>
            </div>
            <Badge className={`text-[8px] h-4 border ${segmentBadge(c.segment)}`}>
              {c.segment}
            </Badge>
            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-2 border-t border-border space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold">{c.total_orders}</p>
                <p className="text-[8px] text-muted-foreground">Orders</p>
              </div>
              <div>
                <p className="text-sm font-bold">{fmtPrice(c.total_spent || 0)}</p>
                <p className="text-[8px] text-muted-foreground">Spent</p>
              </div>
              <div>
                <p className="text-sm font-bold">{fmtPrice(c.avg_order_value || 0)}</p>
                <p className="text-[8px] text-muted-foreground">Avg</p>
              </div>
            </div>
            {c.last_order_at && (
              <p className="text-[9px] text-muted-foreground text-center">
                Last order: {new Date(c.last_order_at).toLocaleDateString()}
              </p>
            )}
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1" onClick={() => onSendOffer(c)}>
                <Gift className="h-3 w-3" /> Send Offer
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1" onClick={() => onSendOffer(c)}>
                <Tag className="h-3 w-3" /> Discount
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1" onClick={() => onSendMessage(c)}>
                <MessageSquare className="h-3 w-3" /> Chat
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
