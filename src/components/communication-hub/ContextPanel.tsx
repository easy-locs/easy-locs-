/**
 * ContextPanel — Layer 3: Dynamic business context sidebar.
 * Shows live data based on conversation type:
 * - Property: lease, rent status, maintenance, documents
 * - Booking: booking details, service info, payment status
 * - Listing: listing info, deal room
 * - Deal: deal lifecycle, offers, counter-offers
 * - Direct/Business: contact info
 */
import { useState, useEffect } from "react";
import {
  User, Mail, Phone, ExternalLink, History, Building, FileText,
  CreditCard, Wrench, Home, Calendar, Receipt, AlertTriangle, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import DealRoomPanel from "@/components/communication/DealRoomPanel";
import EntityActivityLog from "@/components/communication/EntityActivityLog";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import type { ConversationThread } from "./types";
import { SOURCE_MODULE_CONFIG, STATUS_COLORS, STATUS_LABELS, CONV_TYPE_CONFIG } from "./types";

interface Props {
  thread: ConversationThread;
  orgId: string;
}

interface PropertyContext {
  leases: any[];
  rentCalls: any[];
  interventions: any[];
  documents: any[];
  loading: boolean;
}

interface BookingContext {
  booking: any;
  service: any;
  loading: boolean;
}

export default function ContextPanel({ thread, orgId }: Props) {
  const config = CONV_TYPE_CONFIG[thread.conversationType];
  const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];

  const [propertyCtx, setPropertyCtx] = useState<PropertyContext>({ leases: [], rentCalls: [], interventions: [], documents: [], loading: false });
  const [bookingCtx, setBookingCtx] = useState<BookingContext>({ booking: null, service: null, loading: false });

  // Load property management context
  useEffect(() => {
    if (thread.conversationType !== "property" || !thread.tenantId) return;
    setPropertyCtx(p => ({ ...p, loading: true }));

    const loadPropertyContext = async () => {
      try {
        const [leaseRes, rentRes, interventionRes, docRes] = await Promise.all([
          supabase.from("leases").select("id, lease_type, start_date, end_date, rent_amount, charges_amount, status, country")
            .eq("org_id", orgId).eq("tenant_id", thread.tenantId!).order("start_date", { ascending: false }).limit(3),
          supabase.from("rent_calls").select("id, month, total_amount, paid, paid_amount, paid_date")
            .eq("org_id", orgId).eq("tenant_id", thread.tenantId!).order("month", { ascending: false }).limit(6),
          supabase.from("interventions").select("id, title, status, priority, category, created_at")
            .eq("org_id", orgId).eq("tenant_id", thread.tenantId!).order("created_at", { ascending: false }).limit(5),
          supabase.from("documents").select("id, title, doc_type, status, created_at")
            .eq("org_id", orgId).eq("tenant_id", thread.tenantId!).order("created_at", { ascending: false }).limit(5),
        ]);

        setPropertyCtx({
          leases: leaseRes.data || [],
          rentCalls: rentRes.data || [],
          interventions: interventionRes.data || [],
          documents: docRes.data || [],
          loading: false,
        });
      } catch (e) {
        console.warn("[ContextPanel] property context load failed:", e);
        setPropertyCtx(p => ({ ...p, loading: false }));
      }
    };
    loadPropertyContext();
  }, [thread.conversationType, thread.tenantId, orgId]);

  // Load booking context
  useEffect(() => {
    if (thread.conversationType !== "booking" || !thread.bookingId) return;
    setBookingCtx(b => ({ ...b, loading: true }));

    const loadBookingContext = async () => {
      let booking: any = null;
      let service: any = null;

      try {
        if (thread.bookingType === "marketplace") {
          const { data } = await supabase.from("marketplace_bookings").select("*").eq("id", thread.bookingId!).single();
          booking = data;
          if (data?.service_id) {
            const { data: svc } = await supabase.from("marketplace_services").select("id, title, description, price, currency, category, city, country, photo_urls, booking_slug").eq("id", data.service_id).single();
            service = svc;
          }
        } else if (thread.bookingType === "concierge") {
          const { data } = await supabase.from("concierge_orders").select("*").eq("id", thread.bookingId!).single();
          booking = data;
          if (data?.service_id) {
            const { data: svc } = await supabase.from("concierge_services").select("id, title, description, price, currency, category, city, country, photo_url").eq("id", data.service_id).single();
            service = svc;
          }
        } else if (thread.bookingType === "seasonal") {
          const { data } = await supabase.from("booking_requests").select("*").eq("id", thread.bookingId!).single();
          booking = data;
        }
      } catch (e) {
        console.warn("[ContextPanel] booking context load failed:", e);
      }

      setBookingCtx({ booking, service, loading: false });
    };
    loadBookingContext();
  }, [thread.conversationType, thread.bookingId, thread.bookingType, orgId]);

  // Determine if deal room panel should show — only when a deal actually exists
  const showDealRoom = !!(thread.dealId || thread.conversationType === "deal");

  return (
    <div className="w-72 lg:w-80 border-s border-border/50 flex flex-col overflow-hidden bg-muted/5">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Type badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${moduleConfig.cls}`}>
              {moduleConfig.emoji} {moduleConfig.label}
            </Badge>
            <Badge variant="outline" className={`text-2xs px-1.5 py-0 ${config.bg} ${config.text} ${config.border}`}>
              {config.emoji} {config.label}
            </Badge>
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-accent" /> Contact
            </h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{thread.name}</span>
              </div>
              {thread.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <a href={`mailto:${thread.email}`} className="truncate underline">{thread.email}</a>
                </div>
              )}
              {thread.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <a href={`tel:${thread.phone}`} className="underline">{thread.phone}</a>
                </div>
              )}
            </div>
          </div>

          {/* ═══ PROPERTY MANAGEMENT CONTEXT ═══ */}
          {thread.conversationType === "property" && (
            <>
              {(thread.propertyLabel || thread.propertyCountry) && (
                <div className="space-y-1 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Home className="h-3 w-3 text-primary" /> Property
                  </h4>
                  {thread.propertyCountry && (
                    <span className="text-xs">{getCountryEntryOrDefault(thread.propertyCountry).flag} {getCountryEntryOrDefault(thread.propertyCountry).name}</span>
                  )}
                  {thread.propertyLabel && <p className="text-xs text-muted-foreground">{thread.propertyLabel}</p>}
                </div>
              )}

              {propertyCtx.loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {propertyCtx.leases.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-accent" /> Lease
                      </h4>
                      {propertyCtx.leases.map(lease => (
                        <div key={lease.id} className="p-2 rounded-lg bg-muted/20 border border-border/20 text-xs space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{lease.lease_type}</span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${lease.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted"}`}>
                              {lease.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{lease.start_date} → {lease.end_date || "∞"}</p>
                          <p className="font-semibold">{lease.rent_amount}€ + {lease.charges_amount || 0}€</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {propertyCtx.rentCalls.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3 text-accent" /> Rent
                      </h4>
                      <div className="space-y-1">
                        {propertyCtx.rentCalls.slice(0, 4).map(rc => (
                          <div key={rc.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/10">
                            <span className="font-mono text-muted-foreground">{rc.month}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{rc.total_amount}€</span>
                              {rc.paid ? (
                                <Receipt className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {propertyCtx.interventions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Wrench className="h-3 w-3 text-amber-500" /> Maintenance
                      </h4>
                      {propertyCtx.interventions.map(i => (
                        <div key={i.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/10">
                          <span className="truncate flex-1">{i.title}</span>
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${i.priority === "urgent" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
                            {i.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {propertyCtx.documents.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-blue-500" /> Documents
                      </h4>
                      {propertyCtx.documents.map(d => (
                        <div key={d.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/10">
                          <span className="truncate flex-1">{d.title}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{d.doc_type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                  <a href={`/dashboard/rental?tab=tenants`}><User className="h-3 w-3" /> Tenant File</a>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                  <a href={`/dashboard/rental?tab=payments`}><CreditCard className="h-3 w-3" /> Rent Payments</a>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                  <a href={`/dashboard/interventions`}><Wrench className="h-3 w-3" /> Maintenance</a>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                  <a href={`/dashboard/documents`}><FileText className="h-3 w-3" /> Documents</a>
                </Button>
              </div>
            </>
          )}

          {/* ═══ BOOKING CONTEXT ═══ */}
          {thread.conversationType === "booking" && (
            <>
              {bookingCtx.loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-accent" /> Booking
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${moduleConfig.cls}`}>
                        {moduleConfig.emoji} {moduleConfig.label}
                      </Badge>
                      {thread.bookingStatus && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                          {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
                        </Badge>
                      )}
                    </div>
                    {thread.bookingId && <p className="text-[10px] text-muted-foreground font-mono">#{thread.bookingId.slice(0, 8)}</p>}
                    {thread.serviceTitle && <p className="text-xs text-foreground font-medium">{thread.serviceTitle}</p>}
                    {thread.totalPrice != null && (
                      <p className="text-sm font-bold text-foreground">
                        {thread.totalPrice.toFixed(2)} {(thread.currency || "EUR").toUpperCase()}
                      </p>
                    )}

                    {bookingCtx.booking && (
                      <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/20">
                        {bookingCtx.booking.service_date && <p>📅 {bookingCtx.booking.service_date}</p>}
                        {bookingCtx.booking.check_in && <p>📅 {bookingCtx.booking.check_in} → {bookingCtx.booking.check_out}</p>}
                        {bookingCtx.booking.payment_status && (
                          <p>💳 Payment: <span className={bookingCtx.booking.payment_status === "paid" ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>{bookingCtx.booking.payment_status}</span></p>
                        )}
                        {bookingCtx.booking.quantity && bookingCtx.booking.quantity > 1 && <p>👥 Qty: {bookingCtx.booking.quantity}</p>}
                      </div>
                    )}
                  </div>

                  {bookingCtx.service && (
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/20">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Building className="h-3 w-3 text-accent" /> Service
                      </h4>
                      <p className="text-xs font-medium">{bookingCtx.service.title}</p>
                      {bookingCtx.service.category && <Badge variant="outline" className="text-[9px] px-1 py-0">{bookingCtx.service.category}</Badge>}
                      {bookingCtx.service.city && <p className="text-[11px] text-muted-foreground">📍 {bookingCtx.service.city}, {bookingCtx.service.country}</p>}
                      <p className="text-xs font-semibold">{bookingCtx.service.price} {bookingCtx.service.currency}</p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-1">
                {thread.bookingType === "marketplace" && (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                    <a href={`/dashboard/marketplace?booking=${thread.bookingId}`}><ExternalLink className="h-3 w-3" /> View in Marketplace</a>
                  </Button>
                )}
                {thread.bookingType === "concierge" && (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                    <a href={`/dashboard/activities?booking=${thread.bookingId}`}><ExternalLink className="h-3 w-3" /> View in Marketplace</a>
                  </Button>
                )}
                {thread.bookingType === "seasonal" && (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                    <a href={`/dashboard/seasonal?booking=${thread.bookingId}`}><ExternalLink className="h-3 w-3" /> View in Seasonal</a>
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ═══ LISTING CONTEXT ═══ */}
          {thread.conversationType === "listing" && (
            <div className="space-y-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building className="h-3 w-3 text-accent" /> Listing
              </h4>
              {thread.listingTitle && <p className="text-xs font-medium text-foreground">{thread.listingTitle}</p>}
              {thread.listingType && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{thread.listingType}</Badge>}
              {thread.bookingStatus && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                  {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                <a href="/dashboard/real-estate"><ExternalLink className="h-3 w-3" /> View Listings</a>
              </Button>
            </div>
          )}

          {/* ═══ DEAL CONTEXT ═══ */}
          {(thread.conversationType === "deal" || thread.dealId) && (
            <div className="space-y-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                🤝 Deal Room
              </h4>
              {thread.totalPrice != null && (
                <p className="text-sm font-bold text-foreground">
                  {thread.totalPrice.toFixed(2)} {(thread.currency || "EUR").toUpperCase()}
                </p>
              )}
            </div>
          )}

          {/* Property info for non-property threads */}
          {thread.conversationType !== "property" && (thread.propertyLabel || thread.propertyCountry) && (
            <div className="space-y-1 p-2.5 rounded-lg bg-muted/20 border border-border/20">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building className="h-3 w-3 text-accent" /> Property
              </h4>
              {thread.propertyCountry && (
                <span className="text-xs">{getCountryEntryOrDefault(thread.propertyCountry).flag} {getCountryEntryOrDefault(thread.propertyCountry).name}</span>
              )}
              {thread.propertyLabel && <p className="text-xs text-muted-foreground">{thread.propertyLabel}</p>}
            </div>
          )}

          {/* Deal Room Panel — only for threads with deal context */}
          {showDealRoom && thread.contextId && orgId && (
            <div className="pt-3 border-t border-border/30">
              <DealRoomPanel
                contextType={thread.contextType}
                contextId={thread.contextId}
                contextTitle={thread.serviceTitle || thread.listingTitle || thread.propertyLabel}
                targetOrgId={orgId}
                threadId={thread.threadId || thread.id}
                isOrgMember={true}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Activity Timeline */}
      <div className="flex-shrink-0 border-t border-border/30 flex flex-col" style={{ maxHeight: "35%" }}>
        <div className="px-4 py-2.5 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold text-foreground">Activity Timeline</h4>
        </div>
        <div className="flex-1 px-4 pb-4 min-h-0 overflow-y-auto">
          <EntityActivityLog
            entityType={
              thread.conversationType === "property" ? "tenant" :
              thread.propertyId ? "property" :
              "booking"
            }
            entityId={
              thread.conversationType === "property" ? (thread.tenantId || thread.contextId) :
              thread.propertyId ? thread.propertyId :
              (thread.bookingId || thread.contextId)
            }
            orgId={orgId}
            maxItems={20}
          />
        </div>
      </div>
    </div>
  );
}
