/**
 * DealRoomPanel — Smart Deal Room integrated into the Communication Center.
 * Rewired: data via useDealRoomData, mutations via useDealRoomMutations.
 * UI-only orchestrator — zero inline DB logic.
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDealRoomData, type DealStatus } from "@/hooks/deals/useDealRoomData";
import { useDealRoomMutations } from "@/hooks/deals/useDealRoomMutations";
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
import { format, formatDistanceToNow, isPast } from "date-fns";
import { motion } from "framer-motion";

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

const fmtCurrency = (amount: number, currency: string = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "EUR").toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch { return `${amount} ${currency}`; }
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

  const {
    deal, dealData, dealLoading, events, negotiationHistory,
    dealStatus, isOfferExpired, expiryLabel,
    isTerminal, canSendOffer, canAccept, canCancel,
  } = useDealRoomData(contextType, contextId);

  const mutations = useDealRoomMutations({
    deal, userId: user?.id, contextType, contextId, contextTitle, targetOrgId, threadId, isOrgMember,
  });

  // Auto-verify payment when returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && deal?.id && params.get("deal") === deal.id) {
      const dd = deal as any;
      if (dd?.status === "payment_pending") mutations.verifyPayment.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  const statusConfig = dealStatus ? STATUS_CONFIG[dealStatus] : null;
  const StatusIcon = statusConfig?.icon || Clock;

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
        <Button size="sm" className="w-full gap-2 text-xs" onClick={() => mutations.createDeal.mutate()} disabled={mutations.createDeal.isPending}>
          {mutations.createDeal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Open Deal Room
        </Button>
      </div>
    );
  }

  if (dealLoading) {
    return <div className="p-4 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <Handshake className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold text-foreground">Deal Room</span>
          {dealData?.negotiation_round > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5">Round {dealData.negotiation_round}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusConfig && (
            <Badge variant="outline" className={`text-[10px] gap-1 ${statusConfig.color}`}>
              <StatusIcon className="h-3 w-3" />{statusConfig.label}
            </Badge>
          )}
          {expiryLabel && (
            <Badge variant="outline" className={`text-[9px] gap-1 ${isOfferExpired ? "border-destructive/30 text-destructive" : "border-amber-500/30 text-amber-600"}`}>
              <Timer className="h-3 w-3" />{expiryLabel}
            </Badge>
          )}
        </div>
        {dealData?.context_title && <p className="text-[10px] text-muted-foreground mt-1.5 break-words leading-snug">{dealData.context_title}</p>}
      </div>

      {/* Negotiation history */}
      {negotiationHistory.length > 0 && (
        <div className="px-3 py-2.5 border-b border-border/20">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Negotiation History</p>
          <div className="space-y-1">
            {negotiationHistory.map((ev: any, idx: number) => {
              const data = ev.data_json || {};
              const isCounter = ev.event_type === "counter_offer";
              return (
                <motion.div key={ev.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCounter ? <TrendingUp className="h-3 w-3 text-orange-500 shrink-0" /> : <DollarSign className="h-3 w-3 text-purple-500 shrink-0" />}
                    <span className="text-[10px] text-muted-foreground min-w-0 break-words leading-snug">{ev.actor_role === "seller" ? "Seller" : "Buyer"} • R{ev.round_number || idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[11px] font-semibold ${isCounter ? "text-orange-600" : "text-purple-600"}`}>{fmtCurrency(data.amount, data.currency)}</span>
                    <span className="text-[9px] text-muted-foreground/50">{format(new Date(ev.created_at), "dd/MM HH:mm")}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {dealData?.accepted_amount && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
              <span className="text-[10px] font-semibold text-green-600">✅ Accepted</span>
              <span className="text-[12px] font-bold text-green-600">{fmtCurrency(dealData.accepted_amount, dealData.current_offer_currency)}</span>
            </div>
          )}
        </div>
      )}

      {/* Legacy offer summary */}
      {negotiationHistory.length === 0 && (dealData?.current_offer_amount || dealData?.counter_offer_amount || dealData?.accepted_amount) && (
        <div className="px-3 py-2.5 border-b border-border/20 space-y-1.5">
          {dealData.current_offer_amount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Offer</span>
              <span className="font-semibold text-foreground">{fmtCurrency(dealData.current_offer_amount, dealData.current_offer_currency)}</span>
            </div>
          )}
          {dealData.counter_offer_amount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Counter</span>
              <span className="font-semibold text-orange-600">{fmtCurrency(dealData.counter_offer_amount, dealData.current_offer_currency)}</span>
            </div>
          )}
          {dealData.accepted_amount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Accepted</span>
              <span className="font-bold text-green-600">{fmtCurrency(dealData.accepted_amount, dealData.current_offer_currency)}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="px-3 py-2 border-b border-border/20 flex flex-wrap gap-1.5">
          {canSendOffer && (
            <>
              <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 rounded-md"
                onClick={() => { setOfferType("offer"); setShowOfferDialog(true); }}>
                <DollarSign className="h-3 w-3" /> Send Offer
              </Button>
              {(dealStatus === "offer_sent" || dealStatus === "counter_offer" || dealStatus === "negotiation") && (
                <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 rounded-md border-orange-500/30 text-orange-600"
                  onClick={() => { setOfferType("counter_offer"); setShowOfferDialog(true); }}>
                  <TrendingUp className="h-3 w-3" /> Counter
                </Button>
              )}
            </>
          )}
          {canAccept && (
            <Button size="sm" className="text-[10px] h-7 gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => mutations.acceptDeal.mutate()} disabled={mutations.acceptDeal.isPending}>
              {mutations.acceptDeal.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Accept
            </Button>
          )}
          {isOfferExpired && (dealStatus === "offer_sent" || dealStatus === "counter_offer") && (
            <Badge variant="outline" className="text-[9px] h-7 gap-1 border-destructive/30 text-destructive items-center">
              <AlertTriangle className="h-3 w-3" /> Offer expired
            </Badge>
          )}
          {(dealStatus === "accepted" || dealStatus === "payment_pending") && !isOrgMember && (
            <Button size="sm" className="text-[10px] h-7 gap-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => mutations.generatePaymentLink.mutate()} disabled={mutations.generatePaymentLink.isPending}>
              {mutations.generatePaymentLink.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />} Pay Now
            </Button>
          )}
          {dealStatus === "payment_pending" && isOrgMember && (
            <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 rounded-md"
              onClick={() => mutations.verifyPayment.mutate()} disabled={mutations.verifyPayment.isPending}>
              {mutations.verifyPayment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Verify Payment
            </Button>
          )}
          {dealData?.metadata_json?.payment_link_url && dealStatus === "payment_pending" && (
            <a href={dealData.metadata_json.payment_link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-primary hover:underline">
              <ExternalLink className="h-3 w-3" /> Open payment link
            </a>
          )}
          <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 rounded-md" onClick={() => setShowDocDialog(true)}>
            <FileText className="h-3 w-3" /> Doc
          </Button>
          <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 rounded-md" onClick={() => setShowVisitDialog(true)}>
            <MapPin className="h-3 w-3" /> Visit
          </Button>
          {canCancel && (
            <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1 rounded-md text-destructive hover:bg-destructive/10 ml-auto"
              onClick={() => mutations.cancelDeal.mutate()} disabled={mutations.cancelDeal.isPending}>
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
                <motion.div key={ev.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-start">
                  <div className={`mt-0.5 ${evConfig.color}`}><EvIcon className="h-3.5 w-3.5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-foreground leading-tight">
                      {ev.event_type === "status_change" && data.new_status
                        ? data.reason === "offer_expired" ? "⏳ Offer expired — back to negotiation"
                          : `Status → ${STATUS_CONFIG[data.new_status as DealStatus]?.label || data.new_status}`
                        : ev.event_type === "offer" ? `💰 Offer: ${fmtCurrency(data.amount, data.currency)}${data.round ? ` (R${data.round})` : ""}`
                        : ev.event_type === "counter_offer" ? `🔄 Counter: ${fmtCurrency(data.amount, data.currency)}${data.round ? ` (R${data.round})` : ""}`
                        : ev.event_type === "document" ? `📄 ${data.name || "Document shared"}`
                        : ev.event_type === "visit_scheduled" ? `📅 Visit: ${data.date || "TBD"}`
                        : ev.event_type === "payment"
                          ? data.action === "payment_request_sent" ? "💳 Payment requested"
                            : data.action === "stripe_checkout_created" ? `💳 Payment link — ${fmtCurrency(data.amount, data.currency)}`
                            : data.action === "payment_confirmed" ? `✅ Payment confirmed — ${fmtCurrency(data.amount, data.currency)}`
                            : "💳 Payment event"
                        : ev.event_type.replace(/_/g, " ")}
                    </p>
                    {data.message && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{data.message}</p>}
                    {data.note && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{data.note}</p>}
                    {data.expires_at && !isPast(new Date(data.expires_at)) && (
                      <p className="text-[9px] text-amber-600 mt-0.5 flex items-center gap-1">
                        <Timer className="h-2.5 w-2.5" /> Expires {formatDistanceToNow(new Date(data.expires_at), { addSuffix: true })}
                      </p>
                    )}
                    {data.url && ev.event_type === "document" && (
                      <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline mt-0.5 inline-block">View document →</a>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {ev.actor_role && <Badge variant="outline" className="text-[8px] h-3.5 px-1">{ev.actor_role}</Badge>}
                      <p className="text-[9px] text-muted-foreground/60">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}</p>
                    </div>
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
            <DialogDescription>{offerType === "counter_offer" ? "Propose a new price for this deal." : "Submit your offer for this listing or service."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Amount ({(dealData?.current_offer_currency || "EUR").toUpperCase()})</label>
              <Input type="number" step="0.01" min="1" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder="Enter amount..." className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Offer expires in</label>
              <Select value={offerExpiry} onValueChange={setOfferExpiry}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{EXPIRY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Message (optional)</label>
              <Textarea value={offerMessage} onChange={e => setOfferMessage(e.target.value)} placeholder="Add a note..." className="mt-1 min-h-[3rem]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowOfferDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                mutations.sendOffer.mutate({ amount: parseFloat(offerAmount), message: offerMessage, offerType, expiry: offerExpiry });
                setShowOfferDialog(false); setOfferAmount(""); setOfferMessage(""); setOfferExpiry("none");
              }}
              disabled={mutations.sendOffer.isPending || !offerAmount}>
              {mutations.sendOffer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send {offerType === "counter_offer" ? "Counter" : "Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500" /> Share Document</DialogTitle>
            <DialogDescription>Upload a document to the deal room.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="flex flex-col items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/30 cursor-pointer transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{docFile ? docFile.name : "Click to select file"}</span>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setDocFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowDocDialog(false); setDocFile(null); }}>Cancel</Button>
            <Button onClick={() => { if (docFile) { setUploadingDoc(true); mutations.uploadDocument.mutate(docFile, { onSettled: () => { setUploadingDoc(false); setShowDocDialog(false); setDocFile(null); } }); } }} disabled={!docFile || uploadingDoc}>
              {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />} Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Dialog */}
      <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-sky-500" /> Schedule Visit</DialogTitle>
            <DialogDescription>Pick a date and optionally add a note.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
            <Textarea value={visitNote} onChange={e => setVisitNote(e.target.value)} placeholder="Optional note..." className="min-h-[3rem]" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowVisitDialog(false)}>Cancel</Button>
            <Button onClick={() => { mutations.scheduleVisit.mutate({ date: visitDate, note: visitNote }); setShowVisitDialog(false); setVisitDate(""); setVisitNote(""); }} disabled={!visitDate || mutations.scheduleVisit.isPending}>
              {mutations.scheduleVisit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarCheck className="h-4 w-4 mr-1" />} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
