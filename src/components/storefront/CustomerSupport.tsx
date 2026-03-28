/**
 * CustomerSupport — Support tickets, FAQ, seller-buyer messaging
 * Seller: manage tickets, create FAQ
 * Buyer: submit tickets, browse FAQ, chat
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, MessageSquare, Plus, Send, Loader2, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-warning/20 text-warning",
  in_progress: "bg-info/20 text-info",
  waiting_customer: "bg-accent/20 text-accent-foreground",
  waiting_seller: "bg-primary/20 text-primary",
  resolved: "bg-success/20 text-success",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_ICONS: Record<string, typeof AlertTriangle> = {
  low: Clock,
  medium: Clock,
  high: AlertTriangle,
  urgent: AlertTriangle,
};

export default function CustomerSupport({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<"tickets" | "faq" | "new">("tickets");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // New ticket form
  const [ticketForm, setTicketForm] = useState({ subject: "", description: "", category: "general", priority: "medium" });

  // Load tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets", shopId, mode],
    queryFn: async () => {
      const query = (supabase as any).from("storefront_support_tickets")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (mode === "buyer") query.eq("customer_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  // Load messages for selected ticket
  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-messages", selectedTicket],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_ticket_messages")
        .select("*").eq("ticket_id", selectedTicket).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedTicket,
  });

  // Load FAQ
  const { data: faqs = [] } = useQuery({
    queryKey: ["shop-faq", shopId],
    queryFn: async () => {
      const query = (supabase as any).from("storefront_faq")
        .select("*").eq("shop_id", shopId).order("sort_order");
      if (mode === "buyer") query.eq("published", true);
      const { data } = await query;
      return data || [];
    },
  });

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async () => {
      const { data } = await (supabase as any).from("storefront_support_tickets").insert({
        shop_id: shopId, customer_id: user!.id,
        subject: ticketForm.subject, description: ticketForm.description,
        category: ticketForm.category, priority: ticketForm.priority,
      }).select().single();
      // Add initial message
      if (ticketForm.description) {
        await (supabase as any).from("storefront_ticket_messages").insert({
          ticket_id: data.id, sender_id: user!.id, sender_role: "customer", message: ticketForm.description,
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      setTicketForm({ subject: "", description: "", category: "general", priority: "medium" });
      setView("tickets");
      toast.success("Ticket created");
    },
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_ticket_messages").insert({
        ticket_id: selectedTicket, sender_id: user!.id,
        sender_role: mode === "seller" ? "seller" : "customer",
        message: newMessage,
      });
      // Update ticket status
      const newStatus = mode === "seller" ? "waiting_customer" : "waiting_seller";
      await (supabase as any).from("storefront_support_tickets").update({
        status: newStatus, updated_at: new Date().toISOString(),
      }).eq("id", selectedTicket);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-messages"] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      setNewMessage("");
    },
  });

  // Update ticket status
  const updateStatus = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      await (supabase as any).from("storefront_support_tickets").update({
        status, updated_at: new Date().toISOString(),
        ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
      }).eq("id", ticketId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["support-tickets"] }); toast.success("Status updated"); },
  });

  // FAQ management (seller)
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "general" });
  const createFaq = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_faq").insert({
        shop_id: shopId, user_id: user!.id, ...faqForm,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-faq"] });
      setFaqForm({ question: "", answer: "", category: "general" });
      toast.success("FAQ added");
    },
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  // Detail view for a ticket
  if (selectedTicket) {
    const ticket = tickets.find((t: any) => t.id === selectedTicket);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="text-xs">← Back</Button>
          <h4 className="text-sm font-semibold min-w-0 flex-1 break-words leading-snug">{ticket?.subject}</h4>
          <Badge className={`text-[9px] ${STATUS_COLORS[ticket?.status] || ""}`}>{ticket?.status?.replace("_", " ")}</Badge>
        </div>

        {mode === "seller" && (
          <div className="flex gap-1.5">
            {["in_progress", "resolved", "closed"].map(s => (
              <Button key={s} size="sm" variant="outline" className="text-[10px] h-7"
                onClick={() => updateStatus.mutate({ ticketId: selectedTicket, status: s })}>
                {s.replace("_", " ")}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`p-2.5 rounded-xl text-xs ${
              msg.sender_role === "customer" ? "bg-muted ml-4" : msg.sender_role === "seller" ? "bg-primary/10 mr-4" : "bg-warning/10 mx-8 text-center"
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant="secondary" className="text-[8px] capitalize">{msg.sender_role}</Badge>
                <span className="text-[9px] text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[11px]">{msg.message}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..." className="h-8 text-xs flex-1"
            onKeyDown={e => { if (e.key === "Enter" && newMessage.trim()) sendMessage.mutate(); }} />
          <Button size="sm" className="h-8" onClick={() => sendMessage.mutate()}
            disabled={!newMessage.trim() || sendMessage.isPending}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-info" /> Support
        </h3>
        <div className="flex gap-1">
          {["tickets", "faq"].map(v => (
            <Button key={v} size="sm" variant={view === v ? "default" : "ghost"} className="text-[10px] h-6 px-2"
              onClick={() => setView(v as any)}>{v === "tickets" ? "Tickets" : "FAQ"}</Button>
          ))}
          {mode === "buyer" && (
            <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => setView("new")}>
              <Plus className="h-3 w-3 mr-0.5" /> New
            </Button>
          )}
        </div>
      </div>

      {/* NEW TICKET FORM */}
      {view === "new" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-xs font-semibold">New Support Ticket</h4>
            <Input placeholder="Subject" value={ticketForm.subject}
              onChange={e => setTicketForm(p => ({ ...p, subject: e.target.value }))} className="text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={ticketForm.category} onValueChange={v => setTicketForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["general", "order", "payment", "shipping", "return", "product"].map(c => (
                    <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ticketForm.priority} onValueChange={v => setTicketForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high", "urgent"].map(p => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Describe your issue..." value={ticketForm.description}
              onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))} rows={3} className="text-xs" />
            <Button size="sm" className="w-full" onClick={() => createTicket.mutate()}
              disabled={!ticketForm.subject.trim() || createTicket.isPending}>
              {createTicket.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
              Submit Ticket
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TICKETS LIST */}
      {view === "tickets" && (
        <div className="space-y-2">
          {tickets.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No tickets yet</CardContent></Card>
          ) : tickets.map((t: any) => {
            const PriorityIcon = PRIORITY_ICONS[t.priority] || Clock;
            return (
              <Card key={t.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedTicket(t.id)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold line-clamp-2 break-words leading-snug">{t.subject}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[8px] capitalize">{t.category}</Badge>
                        <PriorityIcon className={`h-3 w-3 ${t.priority === "urgent" ? "text-destructive" : t.priority === "high" ? "text-warning" : "text-muted-foreground"}`} />
                        <span className="text-[9px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge className={`text-[8px] shrink-0 ${STATUS_COLORS[t.status] || ""}`}>{t.status?.replace("_", " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAQ */}
      {view === "faq" && (
        <div className="space-y-2">
          {mode === "seller" && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Add FAQ</h4>
                <Input placeholder="Question" value={faqForm.question}
                  onChange={e => setFaqForm(p => ({ ...p, question: e.target.value }))} className="text-xs h-8" />
                <Textarea placeholder="Answer" value={faqForm.answer}
                  onChange={e => setFaqForm(p => ({ ...p, answer: e.target.value }))} rows={2} className="text-xs" />
                <Button size="sm" className="w-full h-7 text-xs" onClick={() => createFaq.mutate()}
                  disabled={!faqForm.question.trim() || !faqForm.answer.trim() || createFaq.isPending}>
                  Add FAQ
                </Button>
              </CardContent>
            </Card>
          )}

          {faqs.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No FAQ entries yet</CardContent></Card>
          ) : faqs.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="p-3">
                <button className="flex items-center justify-between w-full text-left"
                  onClick={() => setExpandedFaq(expandedFaq === f.id ? null : f.id)}>
                  <span className="text-xs font-medium">{f.question}</span>
                  {expandedFaq === f.id ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                </button>
                {expandedFaq === f.id && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{f.answer}</p>
                    {mode === "buyer" && (
                      <button className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground hover:text-primary">
                        <ThumbsUp className="h-3 w-3" /> Helpful ({f.helpful_count || 0})
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
