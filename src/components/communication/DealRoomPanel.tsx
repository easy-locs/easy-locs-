/**
 * DealRoomPanel — Smart Deal Room integrated into the Communication Center.
 * Phase 9b: Enhanced negotiation with counter-offer history, offer expiration,
 * document exchange, and visit scheduling in the timeline.
 */
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { createPaymentRequest } from "@/lib/shared/payment-request";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Handshake, DollarSign, ArrowRightLeft, CheckCircle2,
  XCircle, Clock, Send, FileText, CalendarCheck, Loader2,
  ChevronRight, Plus, TrendingUp, Timer, Upload, MapPin, AlertTriangle,
  CreditCard, ExternalLink, RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes, isPast } from "date-fns";
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
  status_change:   { icon: ArrowRightLeft, color: "text-amber-500" },
  offer:           { icon: DollarSign,     color: "text-purple-500" },
  counter_offer:   { icon: TrendingUp,     color: "text-orange-500" },
  document:        { icon: FileText,       color: "text-blue-500" },
  payment:         { icon: DollarSign,     color: "text-green-500" },
  visit_scheduled: { icon: CalendarCheck,  color: "text-sky-500" },
  offer_expired:   { icon: Timer,          color: "text-muted-foreground" },
};

const EXPIRY_OPTIONS = [
  { value: "none", label: "No expiry" },
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "24h", label: "24 hours" },
  { value: "48h", label: "48 hours" },
  { value: "72h", label: "3 days" },
  { value: "168h", label: "7 days" },
];

function computeExpiryDate(option: string): string | null {
  if (option === "none") return null;
  const hours = parseInt(option);
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

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
  const [offerExpiry, setOfferExpiry] = useState("none");
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitNote, setVisitNote] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // ── Realtime sync ──
  useRealtimeSubscription({
    table: "deal_rooms",
    channelName: `deal-panel-${contextId}`,
    filter: `context_id=eq.${contextId}`,
    queryKeys: [["deal_room_context", contextType, contextId]],
    enabled: !!contextId,
  });

  useRealtimeSubscription({
    table: "deal_events",
    channelName: `deal-events-panel-${contextId}`,
    queryKeys: [["deal_events"]],
    enabled: !!contextId,
  });

  // Fetch deal room
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

  // Negotiation history: extract all offers/counter-offers
  const negotiationHistory = useMemo(() => {
    return (events as any[]).filter(
      (ev: any) => ev.event_type === "offer" || ev.event_type === "counter_offer"
    );
  }, [events]);

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

  // Send offer/counter-offer with optional expiry
  const sendOffer = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(offerAmount);
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      const isCounter = offerType === "counter_offer";
      const expiresAt = computeExpiryDate(offerExpiry);
      const dealD = deal as any;
      const newRound = (dealD?.negotiation_round || 0) + 1;

      const updateData: any = isCounter
        ? { counter_offer_amount: amount, status: "counter_offer", offer_expires_at: expiresAt, negotiation_round: newRound }
        : { current_offer_amount: amount, status: "offer_sent", offer_expires_at: expiresAt, negotiation_round: newRound };

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
        round_number: newRound,
        expires_at: expiresAt,
        data_json: { amount, message: offerMessage || null, expires_at: expiresAt, round: newRound },
      } as any);
    },
    onSuccess: () => {
      setShowOfferDialog(false);
      setOfferAmount("");
      setOfferMessage("");
      setOfferExpiry("none");
      qc.invalidateQueries({ queryKey: ["deal_room_context"] });
      qc.invalidateQueries({ queryKey: ["deal_events"] });
      toast.success(offerType === "counter_offer" ? "Counter-offer sent" : "Offer sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Accept deal → auto-trigger payment request
  const acceptDeal = useMutation({
    mutationFn: async () => {
      const dealD = deal as any;
      const accepted = dealD?.counter_offer_amount || dealD?.current_offer_amount;
      const currency = dealD?.current_offer_currency || "EUR";
      const { error } = await supabase
        .from("deal_rooms")
        .update({ accepted_amount: accepted, status: "accepted" as any, offer_expires_at: null } as any)
        .eq("id", dealD.id);
      if (error) throw error;
      await supabase.from("deal_events").insert({
        deal_id: dealD.id,
        event_type: "status_change",
        actor_id: user!.id,
        data_json: { action: "accepted", accepted_amount: accepted },
      } as any);

      // Auto-trigger payment request
      if (accepted && accepted > 0 && isOrgMember) {
        try {
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("id", dealD.buyer_id)
            .single();

          if (buyerProfile?.email) {
            await createPaymentRequest({
              orgId: targetOrgId,
              senderId: user!.id,
              recipientEmail: buyerProfile.email,
              recipientName: buyerProfile.name || "Customer",
              amount: accepted,
              currency,
              description: `Payment for "${dealD.context_title || "deal"}"`,
              contextType: "deal",
              contextId: dealD.id,
            });

            await supabase
              .from("deal_rooms")
              .update({ status: "payment_pending" as any } as any)
              .eq("id", dealD.id);

            await supabase.from("deal_events").insert({
              deal_id: dealD.id,
              event_type: "payment",
              actor_id: user!.id,
              data_json: { action: "payment_request_sent", amount: accepted, currency },
            } as any);
          }
        } catch (e) {
          console.error("[DealRoom] auto-payment failed:", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_room_context"] });
      qc.invalidateQueries({ queryKey: ["deal_events"] });
      toast.success("Deal accepted! Payment request sent.");
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

  // Upload document to deal
  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!docFile || !deal) throw new Error("No file selected");
      setUploadingDoc(true);
      const path = `deals/${deal.id}/${Date.now()}-${docFile.name}`;
      const buckets = ["chat-media", "property-photos"];
      let finalUrl: string | null = null;

      for (const bucket of buckets) {
        const { error } = await supabase.storage.from(bucket).upload(path, docFile, { upsert: false });
        if (error) continue;
        const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        finalUrl = signedData?.signedUrl || null;
        break;
      }
      if (!finalUrl) throw new Error("Upload failed");

      await supabase.from("deal_events").insert({
        deal_id: deal.id,
        event_type: "document",
        actor_id: user!.id,
        actor_role: isOrgMember ? "seller" : "buyer",
        data_json: { name: docFile.name, url: finalUrl, size: docFile.size },
      } as any);
    },
    onSuccess: () => {
      setShowDocDialog(false);
      setDocFile(null);
      setUploadingDoc(false);
      qc.invalidateQueries({ queryKey: ["deal_events"] });
      toast.success("Document shared");
    },
    onError: (e: any) => {
      setUploadingDoc(false);
      toast.error(e.message);
    },
  });

  // Schedule visit
  const scheduleVisit = useMutation({
    mutationFn: async () => {
      if (!visitDate || !deal) throw new Error("Select a date");
      await supabase.from("deal_events").insert({
        deal_id: deal.id,
        event_type: "visit_scheduled",
        actor_id: user!.id,
        actor_role: isOrgMember ? "seller" : "buyer",
        data_json: { date: visitDate, note: visitNote || null },
      } as any);
    },
    onSuccess: () => {
      setShowVisitDialog(false);
      setVisitDate("");
      setVisitNote("");
      qc.invalidateQueries({ queryKey: ["deal_events"] });
      toast.success("Visit scheduled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Generate Stripe payment link for deal
  const generatePaymentLink = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("No deal");
      const { data, error } = await supabase.functions.invoke("orbit-payment", {
        body: { action: "deal_checkout", deal_id: deal.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["deal_room_context"] });
      qc.invalidateQueries({ queryKey: ["deal_events"] });
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Payment page opened");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Verify payment status
  const verifyPayment = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("No deal");
      const { data, error } = await supabase.functions.invoke("orbit-payment", {
        body: { action: "deal_verify_payment", deal_id: deal.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["deal_room_context"] });
      qc.invalidateQueries({ queryKey: ["deal_events"] });
      if (data?.paid) {
        toast.success("Payment confirmed! Deal is now confirmed.");
      } else {
        toast.info("Payment not yet received.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-verify payment when returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && deal?.id && params.get("deal") === deal.id) {
      const dealD = deal as any;
      if (dealD?.status === "payment_pending") {
        verifyPayment.mutate();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

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

  // Offer expiry countdown
  const offerExpiresAt = dealData?.offer_expires_at ? new Date(dealData.offer_expires_at) : null;
  const isExpired = offerExpiresAt ? isPast(offerExpiresAt) : false;
  const expiryLabel = offerExpiresAt
    ? isExpired
      ? "Expired"
      : `Expires ${formatDistanceToNow(offerExpiresAt, { addSuffix: true })}`
    : null;

  // No deal room yet
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
  const canAccept = !isTerminal && (dealStatus === "offer_sent" || dealStatus === "counter_offer") && !isExpired;
  const canCancel = !isTerminal;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <Handshake className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold text-foreground">Deal Room</span>
          {dealData?.negotiation_round > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
              Round {dealData.negotiation_round}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusConfig && (
            <Badge variant="outline" className={`text-[10px] gap-1 ${statusConfig.color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          )}
          {expiryLabel && (
            <Badge variant="outline" className={`text-[9px] gap-1 ${isExpired ? "border-destructive/30 text-destructive" : "border-amber-500/30 text-amber-600"}`}>
              <Timer className="h-3 w-3" />
              {expiryLabel}
            </Badge>
          )}
        </div>
        {dealData?.context_title && (
          <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{dealData.context_title}</p>
        )}
      </div>

      {/* Negotiation summary — all offers history */}
      {negotiationHistory.length > 0 && (
        <div className="px-3 py-2.5 border-b border-border/20">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Negotiation History</p>
          <div className="space-y-1">
            {negotiationHistory.map((ev: any, idx: number) => {
              const data = ev.data_json || {};
              const isCounter = ev.event_type === "counter_offer";
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCounter ? (
                      <TrendingUp className="h-3 w-3 text-orange-500 shrink-0" />
                    ) : (
                      <DollarSign className="h-3 w-3 text-purple-500 shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground truncate">
                      {ev.actor_role === "seller" ? "Seller" : "Buyer"} • R{ev.round_number || idx + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[11px] font-semibold ${isCounter ? "text-orange-600" : "text-purple-600"}`}>
                      {fmtCurrency(data.amount, data.currency)}
                    </span>
                    <span className="text-[9px] text-muted-foreground/50">
                      {format(new Date(ev.created_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Current amounts */}
          {dealData?.accepted_amount && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
              <span className="text-[10px] font-semibold text-green-600">✅ Accepted</span>
              <span className="text-[12px] font-bold text-green-600">
                {fmtCurrency(dealData.accepted_amount, dealData.current_offer_currency)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Legacy offer summary for when no history events exist */}
      {negotiationHistory.length === 0 && (dealData?.current_offer_amount || dealData?.counter_offer_amount || dealData?.accepted_amount) && (
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
              {(dealStatus === "offer_sent" || dealStatus === "counter_offer" || dealStatus === "negotiation") && (
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
          {isExpired && (dealStatus === "offer_sent" || dealStatus === "counter_offer") && (
            <Badge variant="outline" className="text-[9px] h-7 gap-1 border-destructive/30 text-destructive items-center">
              <AlertTriangle className="h-3 w-3" /> Offer expired
            </Badge>
          )}

          {/* Payment actions for accepted/payment_pending deals */}
          {(dealStatus === "accepted" || dealStatus === "payment_pending") && !isOrgMember && (
            <Button
              size="sm"
              className="text-[10px] h-7 gap-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => generatePaymentLink.mutate()}
              disabled={generatePaymentLink.isPending}
            >
              {generatePaymentLink.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
              Pay Now
            </Button>
          )}
          {dealStatus === "payment_pending" && isOrgMember && (
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] h-7 gap-1 rounded-md"
              onClick={() => verifyPayment.mutate()}
              disabled={verifyPayment.isPending}
            >
              {verifyPayment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Verify Payment
            </Button>
          )}
          {dealData?.metadata_json?.payment_link_url && dealStatus === "payment_pending" && (
            <a
              href={dealData.metadata_json.payment_link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open payment link
            </a>
          )}

          {/* Document & Visit */}
          <Button
            size="sm"
            variant="outline"
            className="text-[10px] h-7 gap-1 rounded-md"
            onClick={() => setShowDocDialog(true)}
          >
            <FileText className="h-3 w-3" /> Doc
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-[10px] h-7 gap-1 rounded-md"
            onClick={() => setShowVisitDialog(true)}
          >
            <MapPin className="h-3 w-3" /> Visit
          </Button>
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
                        ? data.reason === "offer_expired"
                          ? "⏳ Offer expired — back to negotiation"
                          : `Status → ${STATUS_CONFIG[data.new_status as DealStatus]?.label || data.new_status}`
                        : ev.event_type === "offer"
                        ? `💰 Offer: ${fmtCurrency(data.amount, data.currency)}${data.round ? ` (R${data.round})` : ""}`
                        : ev.event_type === "counter_offer"
                        ? `🔄 Counter: ${fmtCurrency(data.amount, data.currency)}${data.round ? ` (R${data.round})` : ""}`
                        : ev.event_type === "document"
                        ? `📄 ${data.name || "Document shared"}`
                        : ev.event_type === "visit_scheduled"
                        ? `📅 Visit: ${data.date || "TBD"}`
                        : ev.event_type === "payment"
                        ? data.action === "payment_request_sent" ? "💳 Payment requested"
                          : data.action === "stripe_checkout_created" ? `💳 Payment link generated — ${fmtCurrency(data.amount, data.currency)}`
                          : data.action === "payment_confirmed" ? `✅ Payment confirmed — ${fmtCurrency(data.amount, data.currency)}`
                          : "💳 Payment event"
                        : ev.event_type.replace(/_/g, " ")}
                    </p>
                    {data.message && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{data.message}</p>
                    )}
                    {data.note && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 italic">{data.note}</p>
                    )}
                    {data.expires_at && !isPast(new Date(data.expires_at)) && (
                      <p className="text-[9px] text-amber-600 mt-0.5 flex items-center gap-1">
                        <Timer className="h-2.5 w-2.5" />
                        Expires {formatDistanceToNow(new Date(data.expires_at), { addSuffix: true })}
                      </p>
                    )}
                    {data.url && ev.event_type === "document" && (
                      <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline mt-0.5 inline-block">
                        View document →
                      </a>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {ev.actor_role && (
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                          {ev.actor_role}
                        </Badge>
                      )}
                      <p className="text-[9px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Offer Dialog — enhanced with expiry */}
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
              <label className="text-sm font-medium text-foreground">Offer expires in</label>
              <Select value={offerExpiry} onValueChange={setOfferExpiry}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Document Upload Dialog */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Share Document
            </DialogTitle>
            <DialogDescription>Upload a document to the deal room.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="flex flex-col items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/30 cursor-pointer transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{docFile ? docFile.name : "Click to select file"}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => setDocFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowDocDialog(false); setDocFile(null); }}>Cancel</Button>
            <Button
              onClick={() => uploadDocument.mutate()}
              disabled={!docFile || uploadingDoc}
            >
              {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Scheduling Dialog */}
      <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sky-500" />
              Schedule Visit
            </DialogTitle>
            <DialogDescription>Propose a visit date for the property or asset.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Date & Time</label>
              <Input
                type="datetime-local"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Note (optional)</label>
              <Textarea
                value={visitNote}
                onChange={e => setVisitNote(e.target.value)}
                placeholder="Meeting point, instructions..."
                className="mt-1 min-h-[3rem]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowVisitDialog(false)}>Cancel</Button>
            <Button
              onClick={() => scheduleVisit.mutate()}
              disabled={!visitDate || scheduleVisit.isPending}
            >
              {scheduleVisit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarCheck className="h-4 w-4 mr-1" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
