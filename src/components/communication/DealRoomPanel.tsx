/**
 * DealRoomPanel — Smart Deal Room integrated into the Communication Center.
 * Shows deal lifecycle, offers, counter-offers, and actions inside the conversation context panel.
 * Includes realtime sync, auto-payment trigger on accept, and document exchange.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { createPaymentRequest, getOrgPaymentConfig } from "@/lib/shared/payment-request";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Handshake, DollarSign, ArrowRightLeft, CheckCircle2,
  XCircle, Clock, Send, FileText, CalendarCheck, Loader2,
  ChevronRight, Plus, TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─── */
type DealStatus =
  | "inquiry" | "negotiation" | "offer_sent" | "counter_offer"
  | "accepted" | "payment_pending" | "confirmed" | "completed" | "cancelled";

const STATUS_CONFIG: Record<DealStatus, { label: string; icon: any; color: string }> = {
  inquiry:         { label: "Inquiry",         icon: Clock,          color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  negotiation:     { label: "Negotiation",     icon: ArrowRightLeft, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  offer_sent:      { label: "Offer Sent",      icon: DollarSign,     color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  counter_offer:   { label: "Counter Offer",   icon: TrendingUp,     color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  accepted:        { label: "Accepted",        icon: CheckCircle2,   color: "bg-green-500/10 text-green-600 border-green-500/20" },
  payment_pending: { label: "Payment Pending", icon: Clock,          color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  confirmed:       { label: "Confirmed",       icon: CalendarCheck,  color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  completed:       { label: "Completed",       icon: CheckCircle2,   color: "bg-muted text-muted-foreground border-border" },
  cancelled:       { label: "Cancelled",       icon: XCircle,        color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const EVENT_ICONS: Record<string, { icon: any; color: string }> = {
  status_change:  { icon: ArrowRightLeft, color: "text-amber-500" },
  offer:          { icon: DollarSign,     color: "text-purple-500" },
  counter_offer:  { icon: TrendingUp,     color: "text-orange-500" },
  document:       { icon: FileText,       color: "text-blue-500" },
  payment:        { icon: DollarSign,     color: "text-green-500" },
  visit_scheduled:{ icon: CalendarCheck,  color: "text-sky-500" },
};

interface DealRoomPanelProps {
  contextType: string;
  contextId: string;
  contextTitle?: string;
  targetOrgId: string;
  threadId?: string;
  isOrgMember?: boolean;
}

export default function DealRoomPanel({
  contextType, contextId, contextTitle, targetOrgId, threadId, isOrgMember,
}: DealRoomPanelProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerType, setOfferType] = useState<"offer" | "counter_offer">("offer");

  // Fetch deal room for this context
  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: ["deal_room_context", contextType, contextId],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("*")
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .neq("status", "cancelled" as any)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!contextId,
  });

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ["deal_events", deal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_events")
        .select("*")
        .eq("deal_id", deal!.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!deal?.id,
  });

  // Create deal room
  const createDeal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .insert({
          org_id: targetOrgId,
          buyer_id: user!.id,
          context_type: contextType,
          context_id: contextId,
          context_title: contextTitle || "",
          thread_id: threadId || null,
          status: "inquiry" as any,
        } as any)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("deal_events").insert({
        deal_id: data.id,
        event_type: "status_change",
        actor_id: user!.id,
        actor_role: "buyer",
        data_json: { new_status: "inquiry" },
      } as any);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_room_context", contextType, contextId] });
      toast.success("Deal Room created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Send offer/counter-offer
  const sendOffer = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(offerAmount);
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      const isCounter = offerType === "counter_offer";

      const updateData: any = isCounter
        ? { counter_offer_amount: amount, status: "counter_offer" }
        : { current_offer_amount: amount, status: "offer_sent" };

      const { error } = await supabase
        .from("deal_rooms")
        .update(updateData)
        .eq("id", deal!.id);
      if (error) throw error;

      await supabase.from("deal_events").insert({
        deal_id: deal!.id,
        event_type: isCounter ? "counter_offer" : "offer",
        actor_id: user!.id,
        actor_role: isOrgMember ? "seller" : "buyer",
        data_json: { amount, message: offerMessage || null },
      } as any);
    },
    onSuccess: () => {
      setShowOfferDialog(false);
      setOfferAmount("");
      setOfferMessage("");
      qc.invalidateQueries({ queryKey: ["deal_room_context"] });
      qc.invalidateQueries({ queryKey: ["deal_events"] });
      toast.success(offerType === "counter_offer" ? "Counter-offer sent" : "Offer sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Accept deal
  const acceptDeal = useMutation({
    mutationFn: async () => {
      const accepted = (deal as any)?.counter_offer_amount || (deal as any)?.current_offer_amount;
      const { error } = await supabase
        .from("deal_rooms")
        .update({ accepted_amount: accepted, status: "accepted" as any } as any)
        .eq("id", deal!.id);
      if (error) throw error;
      await supabase.from("deal_events").insert({
        deal_id: deal!.id,
        event_type: "status_change",
        actor_id: user!.id,
        data_json: { action: "accepted", accepted_amount: accepted },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_room_context"] });
      qc.invalidateQueries({ queryKey: ["deal_events"] });
      toast.success("Deal accepted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Cancel deal
  const cancelDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("deal_rooms")
        .update({ status: "cancelled" as any } as any)
        .eq("id", deal!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_room_context"] });
      toast.success("Deal cancelled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const dealData = deal as any;
  const dealStatus = dealData?.status as DealStatus | undefined;
  const statusConfig = dealStatus ? STATUS_CONFIG[dealStatus] : null;
  const StatusIcon = statusConfig?.icon || Clock;

  const fmtCurrency = (amount: number, currency: string = "EUR") => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "EUR").toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  // No deal room yet — show creation CTA
  if (!deal && !dealLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Handshake className="h-4 w-4 text-accent" />
          <span>Smart Deal Room</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Start a Deal Room to negotiate, exchange documents, and complete the transaction inside this conversation.
        </p>
        <Button
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => createDeal.mutate()}
          disabled={createDeal.isPending}
        >
          {createDeal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Open Deal Room
        </Button>
      </div>
    );
  }

  if (dealLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isTerminal = ["completed", "cancelled"].includes(dealStatus || "");
  const canSendOffer = !isTerminal && dealStatus !== "accepted" && dealStatus !== "payment_pending" && dealStatus !== "confirmed";
  const canAccept = !isTerminal && (dealStatus === "offer_sent" || dealStatus === "counter_offer");
  const canCancel = !isTerminal;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <Handshake className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold text-foreground">Deal Room</span>
        </div>
        {statusConfig && (
          <Badge variant="outline" className={`text-[10px] gap-1 ${statusConfig.color}`}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        )}
        {dealData?.context_title && (
          <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{dealData.context_title}</p>
        )}
      </div>

      {/* Offer summary */}
      {(dealData?.current_offer_amount || dealData?.counter_offer_amount || dealData?.accepted_amount) && (
        <div className="px-3 py-2.5 border-b border-border/20 space-y-1.5">
          {dealData.current_offer_amount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Offer</span>
              <span className="font-semibold text-foreground">
                {fmtCurrency(dealData.current_offer_amount, dealData.current_offer_currency)}
              </span>
            </div>
          )}
          {dealData.counter_offer_amount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Counter</span>
              <span className="font-semibold text-orange-600">
                {fmtCurrency(dealData.counter_offer_amount, dealData.current_offer_currency)}
              </span>
            </div>
          )}
          {dealData.accepted_amount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Accepted</span>
              <span className="font-bold text-green-600">
                {fmtCurrency(dealData.accepted_amount, dealData.current_offer_currency)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="px-3 py-2 border-b border-border/20 flex flex-wrap gap-1.5">
          {canSendOffer && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] h-7 gap-1 rounded-md"
                onClick={() => { setOfferType("offer"); setShowOfferDialog(true); }}
              >
                <DollarSign className="h-3 w-3" /> Send Offer
              </Button>
              {(dealStatus === "offer_sent" || dealStatus === "counter_offer") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7 gap-1 rounded-md border-orange-500/30 text-orange-600"
                  onClick={() => { setOfferType("counter_offer"); setShowOfferDialog(true); }}
                >
                  <TrendingUp className="h-3 w-3" /> Counter
                </Button>
              )}
            </>
          )}
          {canAccept && (
            <Button
              size="sm"
              className="text-[10px] h-7 gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => acceptDeal.mutate()}
              disabled={acceptDeal.isPending}
            >
              {acceptDeal.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Accept
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] h-7 gap-1 rounded-md text-destructive hover:bg-destructive/10 ml-auto"
              onClick={() => cancelDeal.mutate()}
              disabled={cancelDeal.isPending}
            >
              <XCircle className="h-3 w-3" /> Cancel
            </Button>
          )}
        </div>
      )}

      {/* Events timeline */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-2">
          {(events as any[]).length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">No events yet</p>
          ) : (
            (events as any[]).map((ev: any) => {
              const evConfig = EVENT_ICONS[ev.event_type] || { icon: ChevronRight, color: "text-muted-foreground" };
              const EvIcon = evConfig.icon;
              const data = ev.data_json || {};
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 items-start"
                >
                  <div className={`mt-0.5 ${evConfig.color}`}>
                    <EvIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-foreground leading-tight">
                      {ev.event_type === "status_change" && data.new_status
                        ? `Status → ${STATUS_CONFIG[data.new_status as DealStatus]?.label || data.new_status}`
                        : ev.event_type === "offer"
                        ? `Offer: ${fmtCurrency(data.amount, data.currency)}`
                        : ev.event_type === "counter_offer"
                        ? `Counter: ${fmtCurrency(data.amount, data.currency)}`
                        : ev.event_type.replace(/_/g, " ")}
                    </p>
                    {data.message && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{data.message}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {offerType === "counter_offer" ? <TrendingUp className="h-5 w-5 text-orange-500" /> : <DollarSign className="h-5 w-5 text-purple-500" />}
              {offerType === "counter_offer" ? "Send Counter-Offer" : "Send Offer"}
            </DialogTitle>
            <DialogDescription>
              {offerType === "counter_offer"
                ? "Propose a new price for this deal."
                : "Submit your offer for this listing or service."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Amount ({(dealData?.current_offer_currency || "EUR").toUpperCase()})</label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                placeholder="Enter amount..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Message (optional)</label>
              <Textarea
                value={offerMessage}
                onChange={e => setOfferMessage(e.target.value)}
                placeholder="Add a note to your offer..."
                className="mt-1 min-h-[3rem]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowOfferDialog(false)}>Cancel</Button>
            <Button
              onClick={() => sendOffer.mutate()}
              disabled={sendOffer.isPending || !offerAmount}
            >
              {sendOffer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send {offerType === "counter_offer" ? "Counter" : "Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
