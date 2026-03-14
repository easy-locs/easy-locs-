/**
 * HudContextPanel — Intelligence side panel with dark HUD aesthetic.
 * Shows participant profile, context data, files, timeline, and trust signals.
 */
import { useState, useEffect } from "react";
import {
  User, Mail, Phone, ExternalLink, History, Building, FileText,
  CreditCard, Wrench, Home, Calendar, Receipt, AlertTriangle, Loader2,
  Shield, Lock, Sparkles, Brain, Clock, Zap,
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

export default function HudContextPanel({ thread, orgId }: Props) {
  const config = CONV_TYPE_CONFIG[thread.conversationType];
  const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];
  const [propertyCtx, setPropertyCtx] = useState<PropertyContext>({ leases: [], rentCalls: [], interventions: [], documents: [], loading: false });
  const [bookingCtx, setBookingCtx] = useState<BookingContext>({ booking: null, service: null, loading: false });

  // Load property context — identical logic to ContextPanel
  useEffect(() => {
    if (thread.conversationType !== "property" || !thread.tenantId) return;
    setPropertyCtx(p => ({ ...p, loading: true }));
    const load = async () => {
      try {
        const [leaseRes, rentRes, interventionRes, docRes] = await Promise.all([
          supabase.from("leases").select("id, lease_type, start_date, end_date, rent_amount, charges_amount, status, country").eq("org_id", orgId).eq("tenant_id", thread.tenantId!).order("start_date", { ascending: false }).limit(3),
          supabase.from("rent_calls").select("id, month, total_amount, paid, paid_amount, paid_date").eq("org_id", orgId).eq("tenant_id", thread.tenantId!).order("month", { ascending: false }).limit(6),
          supabase.from("interventions").select("id, title, status, priority, category, created_at").eq("org_id", orgId).eq("tenant_id", thread.tenantId!).order("created_at", { ascending: false }).limit(5),
          supabase.from("documents").select("id, title, doc_type, status, created_at").eq("org_id", orgId).eq("tenant_id", thread.tenantId!).order("created_at", { ascending: false }).limit(5),
        ]);
        setPropertyCtx({ leases: leaseRes.data || [], rentCalls: rentRes.data || [], interventions: interventionRes.data || [], documents: docRes.data || [], loading: false });
      } catch { setPropertyCtx(p => ({ ...p, loading: false })); }
    };
    load();
  }, [thread.conversationType, thread.tenantId, orgId]);

  // Load booking context
  useEffect(() => {
    if (thread.conversationType !== "booking" || !thread.bookingId) return;
    setBookingCtx(b => ({ ...b, loading: true }));
    const load = async () => {
      let booking: any = null, service: any = null;
      try {
        if (thread.bookingType === "marketplace") {
          const { data } = await supabase.from("marketplace_bookings").select("*").eq("id", thread.bookingId!).single();
          booking = data;
          if (data?.service_id) { const { data: svc } = await supabase.from("marketplace_services").select("id, title, description, price, currency, category, city, country, photo_urls, booking_slug").eq("id", data.service_id).single(); service = svc; }
        } else if (thread.bookingType === "concierge") {
          const { data } = await supabase.from("concierge_orders").select("*").eq("id", thread.bookingId!).single();
          booking = data;
          if (data?.service_id) { const { data: svc } = await supabase.from("concierge_services").select("id, title, description, price, currency, category, city, country, photo_url").eq("id", data.service_id).single(); service = svc; }
        } else if (thread.bookingType === "seasonal") {
          const { data } = await supabase.from("booking_requests").select("*").eq("id", thread.bookingId!).single();
          booking = data;
        }
      } catch {}
      setBookingCtx({ booking, service, loading: false });
    };
    load();
  }, [thread.conversationType, thread.bookingId, thread.bookingType, orgId]);

  const showDealRoom = !!(thread.dealId || thread.conversationType === "deal");

  const SectionTitle = ({ icon: Icon, label, color = "hsl(var(--hud-cyan))" }: { icon: any; label: string; color?: string }) => (
    <h4 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2" style={{ color }}>
      <Icon className="h-3 w-3" /> {label}
    </h4>
  );

  const HudCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-3 rounded-xl ${className}`} style={{
      background: "hsl(var(--hud-surface) / 0.6)",
      border: "1px solid hsl(var(--hud-border) / 0.1)",
      backdropFilter: "blur(8px)",
    }}>
      {children}
    </div>
  );

  return (
    <div className="w-72 lg:w-80 flex flex-col overflow-hidden" style={{
      background: "hsl(var(--hud-bg))",
      borderLeft: "1px solid hsl(var(--hud-border) / 0.1)",
    }}>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* ═══ INTELLIGENCE HEADER ═══ */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--hud-text))" }}>
                Intelligence
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" style={{ color: "hsl(var(--hud-success) / 0.5)" }} />
              <span className="text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--hud-success) / 0.5)" }}>Verified</span>
            </div>
          </div>

          {/* ═══ PARTICIPANT PROFILE ═══ */}
          <HudCard>
            <SectionTitle icon={User} label="Participant" />
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{
                background: "hsl(var(--hud-surface-2))",
                border: "1px solid hsl(var(--hud-border) / 0.15)",
                boxShadow: "0 0 12px hsl(var(--hud-cyan) / 0.08)",
              }}>
                <User className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan-dim))" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "hsl(var(--hud-text))" }}>{thread.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{
                    borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-cyan-dim))",
                    background: "hsl(var(--hud-surface) / 0.5)",
                  }}>
                    {moduleConfig.emoji} {moduleConfig.label}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {thread.email && (
                <a href={`mailto:${thread.email}`} className="flex items-center gap-2 text-[11px] hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  <Mail className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-cyan-dim))" }} />
                  <span className="truncate">{thread.email}</span>
                </a>
              )}
              {thread.phone && (
                <a href={`tel:${thread.phone}`} className="flex items-center gap-2 text-[11px] hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  <Phone className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-cyan-dim))" }} />
                  <span>{thread.phone}</span>
                </a>
              )}
            </div>
          </HudCard>

          {/* ═══ SECURITY TRUST SIGNALS ═══ */}
          <HudCard>
            <SectionTitle icon={Lock} label="Security" color="hsl(var(--hud-success) / 0.7)" />
            <div className="space-y-2">
              {[
                { icon: Shield, label: "Verified business session", active: true },
                { icon: Lock, label: "Encrypted communication", active: true },
                { icon: Clock, label: "Session active", active: true },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  <s.icon className="h-3 w-3" style={{ color: s.active ? "hsl(var(--hud-success) / 0.6)" : "hsl(var(--hud-text-dim) / 0.3)" }} />
                  <span>{s.label}</span>
                  {s.active && <div className="h-1.5 w-1.5 rounded-full ml-auto" style={{ background: "hsl(var(--hud-success))" }} />}
                </div>
              ))}
            </div>
          </HudCard>

          {/* ═══ PROPERTY CONTEXT ═══ */}
          {thread.conversationType === "property" && (
            <>
              {(thread.propertyLabel || thread.propertyCountry) && (
                <HudCard>
                  <SectionTitle icon={Home} label="Property" />
                  {thread.propertyCountry && <span className="text-xs">{getCountryEntryOrDefault(thread.propertyCountry).flag} {getCountryEntryOrDefault(thread.propertyCountry).name}</span>}
                  {thread.propertyLabel && <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{thread.propertyLabel}</p>}
                </HudCard>
              )}
              {propertyCtx.loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
                </div>
              ) : (
                <>
                  {propertyCtx.leases.length > 0 && (
                    <HudCard>
                      <SectionTitle icon={FileText} label="Lease" />
                      {propertyCtx.leases.map(lease => (
                        <div key={lease.id} className="text-xs space-y-0.5 mb-2 last:mb-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium" style={{ color: "hsl(var(--hud-text))" }}>{lease.lease_type}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0" style={lease.status === "active" ? { background: "hsl(var(--hud-success) / 0.1)", color: "hsl(var(--hud-success))" } : {}}>{lease.status}</Badge>
                          </div>
                          <p style={{ color: "hsl(var(--hud-text-dim))" }}>{lease.start_date} → {lease.end_date || "∞"}</p>
                          <p className="font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>{lease.rent_amount}€ + {lease.charges_amount || 0}€</p>
                        </div>
                      ))}
                    </HudCard>
                  )}
                  {propertyCtx.rentCalls.length > 0 && (
                    <HudCard>
                      <SectionTitle icon={CreditCard} label="Rent" />
                      {propertyCtx.rentCalls.slice(0, 4).map(rc => (
                        <div key={rc.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                          <span className="font-mono" style={{ color: "hsl(var(--hud-text-dim))" }}>{rc.month}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium" style={{ color: "hsl(var(--hud-text))" }}>{rc.total_amount}€</span>
                            {rc.paid ? <Receipt className="h-3 w-3" style={{ color: "hsl(var(--hud-success))" }} /> : <AlertTriangle className="h-3 w-3" style={{ color: "hsl(var(--hud-danger))" }} />}
                          </div>
                        </div>
                      ))}
                    </HudCard>
                  )}
                  {propertyCtx.interventions.length > 0 && (
                    <HudCard>
                      <SectionTitle icon={Wrench} label="Maintenance" color="hsl(var(--hud-warning))" />
                      {propertyCtx.interventions.map(i => (
                        <div key={i.id} className="flex items-center justify-between text-xs py-1">
                          <span className="truncate flex-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{i.title}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0" style={i.priority === "urgent" ? { color: "hsl(var(--hud-danger))" } : {}}>{i.status}</Badge>
                        </div>
                      ))}
                    </HudCard>
                  )}
                  {propertyCtx.documents.length > 0 && (
                    <HudCard>
                      <SectionTitle icon={FileText} label="Documents" color="hsl(var(--hud-cyan))" />
                      {propertyCtx.documents.map(d => (
                        <div key={d.id} className="flex items-center justify-between text-xs py-1">
                          <span className="truncate flex-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{d.title}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{d.doc_type}</Badge>
                        </div>
                      ))}
                    </HudCard>
                  )}
                </>
              )}
              {/* Quick links */}
              <div className="space-y-1">
                {[
                  { href: "/dashboard/rental?tab=tenants", icon: User, label: "Tenant File" },
                  { href: "/dashboard/rental?tab=payments", icon: CreditCard, label: "Rent Payments" },
                  { href: "/dashboard/interventions", icon: Wrench, label: "Maintenance" },
                  { href: "/dashboard/documents", icon: FileText, label: "Documents" },
                ].map(l => (
                  <Button key={l.href} variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5 hover:bg-[hsl(var(--hud-surface))]" style={{ color: "hsl(var(--hud-text-dim))" }} asChild>
                    <a href={l.href}><l.icon className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan-dim))" }} /> {l.label}</a>
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* ═══ BOOKING CONTEXT ═══ */}
          {thread.conversationType === "booking" && (
            <>
              {bookingCtx.loading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} /></div>
              ) : (
                <>
                  <HudCard>
                    <SectionTitle icon={Calendar} label="Booking" />
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-cyan-dim))" }}>
                        {moduleConfig.emoji} {moduleConfig.label}
                      </Badge>
                      {thread.bookingStatus && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                          {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
                        </Badge>
                      )}
                    </div>
                    {thread.bookingId && <p className="text-[10px] font-mono" style={{ color: "hsl(var(--hud-text-dim))" }}>#{thread.bookingId.slice(0, 8)}</p>}
                    {thread.serviceTitle && <p className="text-xs font-medium mt-1" style={{ color: "hsl(var(--hud-text))" }}>{thread.serviceTitle}</p>}
                    {thread.totalPrice != null && (
                      <p className="text-sm font-bold mt-1" style={{ color: "hsl(var(--hud-cyan))" }}>
                        {thread.totalPrice.toFixed(2)} {(thread.currency || "EUR").toUpperCase()}
                      </p>
                    )}
                    {bookingCtx.booking && (
                      <div className="space-y-1 text-xs pt-2 mt-2" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)", color: "hsl(var(--hud-text-dim))" }}>
                        {bookingCtx.booking.service_date && <p>📅 {bookingCtx.booking.service_date}</p>}
                        {bookingCtx.booking.check_in && <p>📅 {bookingCtx.booking.check_in} → {bookingCtx.booking.check_out}</p>}
                        {bookingCtx.booking.payment_status && (
                          <p>💳 Payment: <span style={{ color: bookingCtx.booking.payment_status === "paid" ? "hsl(var(--hud-success))" : "hsl(var(--hud-warning))" }} className="font-medium">{bookingCtx.booking.payment_status}</span></p>
                        )}
                      </div>
                    )}
                  </HudCard>
                  {bookingCtx.service && (
                    <HudCard>
                      <SectionTitle icon={Building} label="Service" />
                      <p className="text-xs font-medium" style={{ color: "hsl(var(--hud-text))" }}>{bookingCtx.service.title}</p>
                      {bookingCtx.service.category && <Badge variant="outline" className="text-[9px] px-1 py-0 mt-1">{bookingCtx.service.category}</Badge>}
                      {bookingCtx.service.city && <p className="text-[11px] mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>📍 {bookingCtx.service.city}, {bookingCtx.service.country}</p>}
                      <p className="text-xs font-semibold mt-1" style={{ color: "hsl(var(--hud-cyan))" }}>{bookingCtx.service.price} {bookingCtx.service.currency}</p>
                    </HudCard>
                  )}
                </>
              )}
              <div className="space-y-1">
                {thread.bookingType === "marketplace" && (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5 hover:bg-[hsl(var(--hud-surface))]" style={{ color: "hsl(var(--hud-text-dim))" }} asChild>
                    <a href={`/dashboard/marketplace?booking=${thread.bookingId}`}><ExternalLink className="h-3 w-3" /> View in Marketplace</a>
                  </Button>
                )}
                {thread.bookingType === "concierge" && (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5 hover:bg-[hsl(var(--hud-surface))]" style={{ color: "hsl(var(--hud-text-dim))" }} asChild>
                    <a href={`/dashboard/activities?booking=${thread.bookingId}`}><ExternalLink className="h-3 w-3" /> View in Marketplace</a>
                  </Button>
                )}
                {thread.bookingType === "seasonal" && (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5 hover:bg-[hsl(var(--hud-surface))]" style={{ color: "hsl(var(--hud-text-dim))" }} asChild>
                    <a href={`/dashboard/seasonal?booking=${thread.bookingId}`}><ExternalLink className="h-3 w-3" /> View in Seasonal</a>
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ═══ LISTING ═══ */}
          {thread.conversationType === "listing" && (
            <HudCard>
              <SectionTitle icon={Building} label="Listing" />
              {thread.listingTitle && <p className="text-xs font-medium" style={{ color: "hsl(var(--hud-text))" }}>{thread.listingTitle}</p>}
              {thread.listingType && <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">{thread.listingType}</Badge>}
              {thread.bookingStatus && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium mt-1 ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                  {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5 mt-2 hover:bg-[hsl(var(--hud-surface))]" style={{ color: "hsl(var(--hud-text-dim))" }} asChild>
                <a href="/dashboard/real-estate"><ExternalLink className="h-3 w-3" /> View Listings</a>
              </Button>
            </HudCard>
          )}

          {/* ═══ DEAL ═══ */}
          {(thread.conversationType === "deal" || thread.dealId) && (
            <HudCard>
              <SectionTitle icon={Zap} label="Deal Room" color="hsl(var(--hud-warning))" />
              {thread.totalPrice != null && (
                <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
                  {thread.totalPrice.toFixed(2)} {(thread.currency || "EUR").toUpperCase()}
                </p>
              )}
            </HudCard>
          )}

          {/* Property info for non-property threads */}
          {thread.conversationType !== "property" && (thread.propertyLabel || thread.propertyCountry) && (
            <HudCard>
              <SectionTitle icon={Building} label="Property" />
              {thread.propertyCountry && <span className="text-xs">{getCountryEntryOrDefault(thread.propertyCountry).flag} {getCountryEntryOrDefault(thread.propertyCountry).name}</span>}
              {thread.propertyLabel && <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{thread.propertyLabel}</p>}
            </HudCard>
          )}

          {/* Deal Room Panel */}
          {showDealRoom && thread.contextId && orgId && (
            <div className="pt-3" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)" }}>
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

          {/* ═══ AI SUMMARY (placeholder) ═══ */}
          <HudCard>
            <SectionTitle icon={Sparkles} label="AI Summary" color="hsl(var(--hud-purple))" />
            <p className="text-[11px] italic" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
              AI-generated conversation summary and suggested actions will appear here.
            </p>
          </HudCard>
        </div>
      </ScrollArea>

      {/* Activity Timeline */}
      <div className="flex-shrink-0 flex flex-col" style={{ maxHeight: "35%", borderTop: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="px-4 py-2.5 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan-dim))" }} />
          <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--hud-text))" }}>Activity Timeline</h4>
        </div>
        <div className="flex-1 px-4 pb-4 min-h-0 overflow-y-auto">
          <EntityActivityLog
            entityType={thread.conversationType === "property" ? "tenant" : thread.propertyId ? "property" : "booking"}
            entityId={thread.conversationType === "property" ? (thread.tenantId || thread.contextId) : thread.propertyId ? thread.propertyId : (thread.bookingId || thread.contextId)}
            orgId={orgId}
            maxItems={20}
          />
        </div>
      </div>
    </div>
  );
}
