/**
 * RentCallThreadView — Orbit rent thread UI showing system timeline,
 * pay/receipt/lease actions, and communication context.
 * context_type = "rent_call", context_id = rent_call.id
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Receipt, FileText, Home, CreditCard, MessageCircle,
  Calendar, CheckCircle, Clock, AlertTriangle, Loader2,
  Download, ChevronRight, Bell, Send, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/country-config";
import { useNavigate } from "react-router-dom";
import RentStatusBadge from "@/components/rent/RentStatusBadge";

interface TimelineEvent {
  id: string;
  type: "system" | "payment" | "document" | "reminder";
  label: string;
  description?: string;
  timestamp: string;
  icon: typeof Clock;
  color: string;
  action?: { label: string; onClick: () => void };
}

interface RentCallThreadViewProps {
  rentCallId: string;
  onPayRent?: () => void;
}

export default function RentCallThreadView({ rentCallId, onPayRent }: RentCallThreadViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rentCall, setRentCall] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [rcRes, msgRes] = await Promise.all([
        supabase
          .from("rent_calls")
          .select("*, tenants(name, email), properties(label, city, country, address), leases(lease_type, start_date, end_date, payment_day, status)")
          .eq("id", rentCallId)
          .single(),
        supabase
          .from("messages")
          .select("id, content, message_type, category, created_at, sender_id")
          .eq("context_id", rentCallId)
          .order("created_at", { ascending: true })
          .limit(100),
      ]);
      setRentCall(rcRes.data);
      setMessages(msgRes.data || []);
      setLoading(false);
    };
    load();
  }, [rentCallId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rentCall) {
    return <div className="text-center py-12 text-muted-foreground">Rent call not found</div>;
  }

  const country = rentCall.properties?.country || "FR";
  const fmt = (n: number) => formatCurrency(n, country);
  const remaining = rentCall.total_amount - (rentCall.paid_amount || 0);

  // Build timeline from system messages + rent_call state
  const timeline: TimelineEvent[] = [];

  // Notice created
  timeline.push({
    id: "created",
    type: "system",
    label: "Rent notice created",
    description: `${fmt(rentCall.total_amount)} for ${rentCall.month}`,
    timestamp: rentCall.created_at || rentCall.month + "-01",
    icon: Calendar,
    color: "text-muted-foreground",
  });

  // System messages from Orbit
  messages.forEach(msg => {
    if (msg.message_type === "system") {
      const content = typeof msg.content === "string" ? msg.content : (msg.content?.text || JSON.stringify(msg.content));
      let icon = Bell;
      let color = "text-muted-foreground";

      if (content.toLowerCase().includes("reminder")) { icon = Bell; color = "text-warning"; }
      if (content.toLowerCase().includes("late")) { icon = AlertTriangle; color = "text-destructive"; }
      if (content.toLowerCase().includes("dunning")) { icon = AlertTriangle; color = "text-destructive"; }
      if (content.toLowerCase().includes("paid") || content.toLowerCase().includes("received")) { icon = CheckCircle; color = "text-success"; }
      if (content.toLowerCase().includes("receipt")) { icon = Receipt; color = "text-success"; }

      timeline.push({
        id: msg.id,
        type: "system",
        label: content.length > 80 ? content.slice(0, 77) + "..." : content,
        timestamp: msg.created_at,
        icon,
        color,
      });
    }
  });

  // Payment event
  if (rentCall.paid) {
    timeline.push({
      id: "paid",
      type: "payment",
      label: "Payment received",
      description: `${fmt(rentCall.total_amount)} via ${rentCall.payment_method || "wallet"}`,
      timestamp: rentCall.paid_date || rentCall.updated_at,
      icon: CheckCircle,
      color: "text-success",
    });
  }

  // Receipt event
  if (rentCall.receipt_pdf_url) {
    timeline.push({
      id: "receipt",
      type: "document",
      label: "Receipt generated",
      description: rentCall.receipt_validated ? "Validated" : "Available",
      timestamp: rentCall.updated_at,
      icon: Receipt,
      color: "text-success",
      action: {
        label: "Download",
        onClick: () => window.open(rentCall.receipt_pdf_url, "_blank"),
      },
    });
  }

  // Sort by timestamp
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="space-y-5">
      {/* Rent call header */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{rentCall.properties?.label || "Property"}</p>
              <p className="text-[11px] text-muted-foreground">{rentCall.tenants?.name} · {rentCall.month}</p>
            </div>
          </div>
          <RentStatusBadge status={rentCall.payment_status || (rentCall.paid ? "paid" : "pending")} />
        </div>

        {/* Amount summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-sm font-bold text-foreground">{fmt(rentCall.total_amount)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground">Paid</p>
            <p className="text-sm font-bold text-success">{fmt(rentCall.paid_amount || 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground">Remaining</p>
            <p className={`text-sm font-bold ${remaining > 0 ? "text-destructive" : "text-success"}`}>{fmt(remaining)}</p>
          </div>
        </div>
      </div>

      {/* System timeline */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Timeline</h4>
        <div className="relative space-y-0">
          {timeline.map((event, i) => {
            const Icon = event.icon;
            const isLast = i === timeline.length - 1;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-3 pb-4 last:pb-0"
              >
                {/* Line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    event.type === "payment" ? "bg-success/10" :
                    event.type === "document" ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Icon className={`h-4 w-4 ${event.color}`} />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-medium text-foreground leading-tight">{event.label}</p>
                  {event.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{event.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(event.timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {event.action && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 mt-1 text-xs gap-1" onClick={event.action.onClick}>
                      {event.action.label} <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        {!rentCall.paid && remaining > 0 && onPayRent && (
          <Button className="w-full h-11 gap-2 rounded-2xl font-bold" onClick={onPayRent}>
            <CreditCard className="h-4 w-4" /> Pay {fmt(remaining)}
          </Button>
        )}

        {rentCall.receipt_pdf_url && (
          <Button variant="outline" className="w-full gap-2" onClick={() => window.open(rentCall.receipt_pdf_url, "_blank")}>
            <Download className="h-4 w-4" /> Download Receipt
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {rentCall.lease_id && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => navigate(`/dashboard/leases?record=${rentCall.lease_id}`)}
            >
              <FileText className="h-3.5 w-3.5" /> View Lease
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => navigate(`/dashboard/properties?detail=${rentCall.property_id}`)}
          >
            <Home className="h-3.5 w-3.5" /> View Property
          </Button>
        </div>
      </div>
    </div>
  );
}
