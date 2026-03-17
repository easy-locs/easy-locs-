/**
 * EntityActivityLog — Aggregated timeline of all events for a given entity.
 * Shows messages, payments, bookings, documents, interventions in chronological order.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, CreditCard, FileText, Wrench, CalendarCheck, Clock, User, Mail, Receipt } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "@/lib/date-locales";

export interface ActivityEvent {
  id: string;
  type: "message" | "payment" | "booking" | "document" | "intervention" | "notification" | "lease";
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
  icon: React.ElementType;
  color: string;
}

interface Props {
  entityType: "property" | "tenant" | "booking" | "lease";
  entityId: string;
  orgId: string;
  maxItems?: number;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  message: { icon: MessageCircle, color: "text-accent" },
  payment: { icon: CreditCard, color: "text-emerald-500" },
  booking: { icon: CalendarCheck, color: "text-sky-500" },
  document: { icon: FileText, color: "text-violet-500" },
  intervention: { icon: Wrench, color: "text-amber-500" },
  notification: { icon: Mail, color: "text-blue-500" },
  lease: { icon: Receipt, color: "text-primary" },
};

export default function EntityActivityLog({ entityType, entityId, orgId, maxItems = 50 }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    const allEvents: ActivityEvent[] = [];

    try {
      // Messages
      let msgQuery = supabase.from("messages").select("id, content, created_at, sender_id, category, message_type, contact_name").eq("org_id", orgId);
      if (entityType === "property") msgQuery = msgQuery.eq("property_id", entityId);
      else if (entityType === "tenant") msgQuery = msgQuery.eq("tenant_id", entityId);
      else if (entityType === "booking") msgQuery = msgQuery.eq("booking_id", entityId);
      const { data: msgs } = await msgQuery.order("created_at", { ascending: false }).limit(maxItems);

      if (msgs) {
        msgs.forEach(m => {
          allEvents.push({
            id: `msg-${m.id}`,
            type: "message",
            title: m.message_type === "system" ? "System message" : `Message${m.contact_name ? ` from ${m.contact_name}` : ""}`,
            description: m.content.slice(0, 120),
            timestamp: m.created_at,
            icon: TYPE_CONFIG.message.icon,
            color: TYPE_CONFIG.message.color,
            metadata: { category: m.category },
          });
        });
      }

      // Payments (rent_calls for property/tenant)
      if (entityType === "property" || entityType === "tenant") {
        let payQuery = supabase.from("rent_calls").select("id, month, total_amount, paid, paid_date").eq("org_id", orgId);
        if (entityType === "property") payQuery = payQuery.eq("property_id", entityId);
        if (entityType === "tenant") payQuery = payQuery.eq("tenant_id", entityId);
        const { data: payments } = await payQuery.order("month", { ascending: false }).limit(maxItems);
        if (payments) {
          payments.forEach(p => {
            allEvents.push({
              id: `pay-${p.id}`,
              type: "payment",
              title: p.paid ? `💚 Rent paid — ${p.month}` : `⏳ Rent due — ${p.month}`,
              description: `${p.total_amount}€${p.paid_date ? ` — Paid on ${p.paid_date}` : ""}`,
              timestamp: p.paid_date || `${p.month}-01`,
              icon: TYPE_CONFIG.payment.icon,
              color: TYPE_CONFIG.payment.color,
            });
          });
        }
      }

      // Documents
      if (entityType === "property" || entityType === "tenant") {
        let docQuery = supabase.from("documents").select("id, title, doc_type, created_at, status").eq("org_id", orgId);
        // Documents are linked via lease_id, not directly. Try by lease.
        if (entityType === "property") {
          const { data: leases } = await supabase.from("leases").select("id").eq("property_id", entityId).eq("org_id", orgId);
          if (leases?.length) {
            docQuery = docQuery.in("lease_id", leases.map(l => l.id));
          }
        }
        const { data: docs } = await docQuery.order("created_at", { ascending: false }).limit(maxItems);
        if (docs) {
          docs.forEach(d => {
            allEvents.push({
              id: `doc-${d.id}`,
              type: "document",
              title: d.title,
              description: `${d.doc_type} — ${d.status}`,
              timestamp: d.created_at,
              icon: TYPE_CONFIG.document.icon,
              color: TYPE_CONFIG.document.color,
            });
          });
        }
      }

      // Interventions
      if (entityType === "property" || entityType === "tenant") {
        let intQuery = supabase.from("interventions").select("id, title, status, priority, created_at, category").eq("org_id", orgId);
        if (entityType === "property") intQuery = intQuery.eq("property_id", entityId);
        if (entityType === "tenant") intQuery = intQuery.eq("tenant_id", entityId);
        const { data: interventions } = await intQuery.order("created_at", { ascending: false }).limit(maxItems);
        if (interventions) {
          interventions.forEach(i => {
            allEvents.push({
              id: `int-${i.id}`,
              type: "intervention",
              title: i.title,
              description: `${i.category} — ${i.priority} — ${i.status}`,
              timestamp: i.created_at,
              icon: TYPE_CONFIG.intervention.icon,
              color: TYPE_CONFIG.intervention.color,
            });
          });
        }
      }

      // Booking requests (for property)
      if (entityType === "property") {
        const { data: bookings } = await supabase
          .from("booking_requests")
          .select("id, guest_name, check_in, check_out, status, created_at")
          .eq("property_id", entityId)
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(maxItems);
        if (bookings) {
          bookings.forEach(b => {
            allEvents.push({
              id: `book-${b.id}`,
              type: "booking",
              title: `Booking from ${b.guest_name}`,
              description: `${b.check_in} → ${b.check_out} — ${b.status}`,
              timestamp: b.created_at || b.check_in,
              icon: TYPE_CONFIG.booking.icon,
              color: TYPE_CONFIG.booking.color,
            });
          });
        }
      }

      // Leases (for property or tenant)
      if (entityType === "property" || entityType === "tenant") {
        let leaseQuery = supabase.from("leases").select("id, lease_type, start_date, end_date, rent_amount, status, created_at").eq("org_id", orgId);
        if (entityType === "property") leaseQuery = leaseQuery.eq("property_id", entityId);
        if (entityType === "tenant") leaseQuery = leaseQuery.eq("tenant_id", entityId);
        const { data: leases } = await leaseQuery.order("created_at", { ascending: false }).limit(10);
        if (leases) {
          leases.forEach(l => {
            allEvents.push({
              id: `lease-${l.id}`,
              type: "lease",
              title: `Lease ${l.lease_type}`,
              description: `${l.start_date}${l.end_date ? ` → ${l.end_date}` : ""} — ${l.rent_amount}€ — ${l.status}`,
              timestamp: l.created_at,
              icon: TYPE_CONFIG.lease.icon,
              color: TYPE_CONFIG.lease.color,
            });
          });
        }
      }

      // Sort by timestamp descending
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(allEvents.slice(0, maxItems));
    } catch (err) {
      console.error("[EntityActivityLog] Load failed:", err);
    }
    setLoading(false);
  }, [entityType, entityId, orgId, maxItems]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="relative pl-6 space-y-0">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        {events.map((event, i) => {
          const Icon = event.icon;
          return (
            <div key={event.id} className="relative pb-4">
              {/* Timeline dot */}
              <div className={`absolute left-[-13px] top-1 h-5 w-5 rounded-full bg-card border-2 border-border flex items-center justify-center`}>
                <Icon className={`h-2.5 w-2.5 ${event.color}`} />
              </div>
              <div className="ml-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-foreground">{event.title}</p>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{event.type}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {(() => {
                    try {
                      return formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: fr });
                    } catch {
                      return event.timestamp;
                    }
                  })()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
