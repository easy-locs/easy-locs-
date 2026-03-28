/**
 * EntityActivityLog — Aggregated timeline of all events for a given entity.
 * Shows messages, payments, bookings, documents, interventions in chronological order.
 */

import { useState, useEffect, useCallback } from "react";
import * as actRepo from "@/repositories/activity-log.repository";
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
      const msgs = await actRepo.fetchMessages(entityType, entityId, maxItems);

      if (msgs) {
        msgs.forEach((m: any) => {
          allEvents.push({
            id: `msg-${m.id}`, type: "message",
            title: m.message_type === "system" ? "System message" : `Message${m.contact_name ? ` from ${m.contact_name}` : ""}`,
            description: (m.content || m.body || "").slice(0, 120), timestamp: m.created_at,
            icon: TYPE_CONFIG.message.icon, color: TYPE_CONFIG.message.color,
          });
        });
      }

      if (entityType === "property" || entityType === "tenant") {
        const payments = await actRepo.fetchPayments(orgId, entityType, entityId, maxItems);
          payments.forEach((p: any) => {
            allEvents.push({
              id: `pay-${p.id}`, type: "payment",
              title: p.paid ? `💚 Rent paid — ${p.month}` : `⏳ Rent due — ${p.month}`,
              description: `${p.total_amount}€${p.paid_date ? ` — Paid on ${p.paid_date}` : ""}`,
              timestamp: p.paid_date || `${p.month}-01`,
              icon: TYPE_CONFIG.payment.icon, color: TYPE_CONFIG.payment.color,
            });
          });
        }
      }

      if (entityType === "property" || entityType === "tenant") {
        const docs = await actRepo.fetchDocuments(orgId, entityType, entityId, maxItems);
        if (docs) {
          docs.forEach((d: any) => {
            allEvents.push({
              id: `doc-${d.id}`, type: "document", title: d.title,
              description: `${d.doc_type} — ${d.status}`, timestamp: d.created_at,
              icon: TYPE_CONFIG.document.icon, color: TYPE_CONFIG.document.color,
            });
          });
        }
      }

      if (entityType === "property" || entityType === "tenant") {
        const interventions = await actRepo.fetchInterventions(orgId, entityType, entityId, maxItems);
        if (interventions) {
          interventions.forEach((i: any) => {
            allEvents.push({
              id: `int-${i.id}`, type: "intervention", title: i.title,
              description: `${i.category} — ${i.priority} — ${i.status}`, timestamp: i.created_at,
              icon: TYPE_CONFIG.intervention.icon, color: TYPE_CONFIG.intervention.color,
            });
          });
        }
      }

      if (entityType === "property") {
        const bookings = await actRepo.fetchBookingRequests(orgId, entityId, maxItems);
        if (bookings) {
          bookings.forEach((b: any) => {
            allEvents.push({
              id: `book-${b.id}`, type: "booking",
              title: `Booking from ${b.guest_name}`,
              description: `${b.check_in} → ${b.check_out} — ${b.status}`,
              timestamp: b.created_at || b.check_in,
              icon: TYPE_CONFIG.booking.icon, color: TYPE_CONFIG.booking.color,
            });
          });
        }
      }

      if (entityType === "property" || entityType === "tenant") {
        const leases = await actRepo.fetchLeases(orgId, entityType, entityId);
        if (leases) {
          leases.forEach((l: any) => {
            allEvents.push({
              id: `lease-${l.id}`, type: "lease",
              title: `Lease ${l.lease_type}`,
              description: `${l.start_date}${l.end_date ? ` → ${l.end_date}` : ""} — ${l.rent_amount}€ — ${l.status}`,
              timestamp: l.created_at,
              icon: TYPE_CONFIG.lease.icon, color: TYPE_CONFIG.lease.color,
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
