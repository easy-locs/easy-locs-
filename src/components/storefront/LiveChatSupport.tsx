/**
 * LiveChatSupport — Support tickets, live chat, FAQ bot
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
import { MessageCircle, Send, Bot, Clock, CheckCircle2, AlertCircle, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode?: "buyer" | "seller";
}

const FAQ: Record<string, string> = {
  "shipping": "We ship within 3-7 business days. Free shipping on orders above 50€.",
  "returns": "You can return items within 30 days of delivery for a full refund.",
  "payment": "We accept credit cards, PayPal, and LOCS wallet payments.",
  "tracking": "You'll receive a tracking number by email once your order ships.",
  "contact": "You can reach us via this support chat or by creating a ticket.",
};

export default function LiveChatSupport({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [chatInput, setChatInput] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets", shopId, user?.id, mode],
    queryFn: async () => {
      const q = (supabase as any).from("storefront_support_tickets").select("*");
      if (mode === "seller") q.eq("shop_id", shopId);
      else q.eq("customer_id", user!.id).eq("shop_id", shopId);
      const { data } = await q.order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["support-messages", activeTicket],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_support_messages")
        .select("*")
        .eq("ticket_id", activeTicket)
        .order("created_at");
      return data || [];
    },
    enabled: !!activeTicket,
    refetchInterval: 5000,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { data } = await (supabase as any).from("storefront_support_tickets").insert({
        shop_id: shopId,
        customer_id: user!.id,
        subject: newSubject,
      }).select().single();
      if (newMessage && data) {
        await (supabase as any).from("storefront_support_messages").insert({
          ticket_id: data.id,
          sender_id: user!.id,
          message: newMessage,
        });
      }
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      setNewSubject("");
      setNewMessage("");
      if (data) setActiveTicket(data.id);
      toast.success("Ticket created");
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!chatInput.trim() || !activeTicket) return;
      await (supabase as any).from("storefront_support_messages").insert({
        ticket_id: activeTicket,
        sender_id: user!.id,
        message: chatInput,
      });
      // Check for FAQ auto-reply
      const lowerMsg = chatInput.toLowerCase();
      const faqKey = Object.keys(FAQ).find(k => lowerMsg.includes(k));
      if (faqKey) {
        await (supabase as any).from("storefront_support_messages").insert({
          ticket_id: activeTicket,
          sender_id: user!.id,
          message: `🤖 ${FAQ[faqKey]}`,
          is_bot: true,
        });
      }
      await (supabase as any).from("storefront_support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", activeTicket);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["support-messages"] }); setChatInput(""); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await (supabase as any).from("storefront_support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["support-tickets"] }); toast.success("Status updated"); },
  });

  const statusIcon = (s: string) => {
    switch (s) {
      case "open": return <AlertCircle className="w-3 h-3 text-warning" />;
      case "in_progress": return <Clock className="w-3 h-3 text-info" />;
      case "resolved": return <CheckCircle2 className="w-3 h-3 text-success" />;
      default: return <MessageCircle className="w-3 h-3" />;
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            {mode === "seller" ? "Support Center" : "Help & Support"}
          </h3>
          <Badge variant="outline" className="text-2xs">{tickets.filter((t: any) => t.status === "open").length} open</Badge>
        </div>

        {activeTicket ? (
          <div className="space-y-3">
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setActiveTicket(null)}>
              ← Back to tickets
            </Button>
            <div className="max-h-60 overflow-y-auto space-y-2 bg-muted/20 rounded-xl p-3">
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id && !msg.is_bot ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                    msg.is_bot ? "bg-accent/10 text-accent-foreground" :
                    msg.sender_id === user.id ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                  }`}>
                    {msg.is_bot && <Bot className="w-3 h-3 inline mr-1" />}
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-9 text-xs"
                onKeyDown={e => e.key === "Enter" && sendMessage.mutate()}
              />
              <Button size="sm" className="h-9" onClick={() => sendMessage.mutate()} disabled={!chatInput.trim()}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {mode === "buyer" && (
              <div className="space-y-2 border border-border rounded-xl p-3">
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject..." className="h-8 text-xs" />
                <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Describe your issue..." className="text-xs" rows={2} />
                <Button size="sm" className="w-full text-xs" onClick={() => createTicket.mutate()} disabled={!newSubject || createTicket.isPending}>
                  <Plus className="w-3 h-3 mr-1" /> Create Ticket
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
            ) : tickets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No tickets yet</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket: any) => (
                  <button
                    key={ticket.id}
                    onClick={() => setActiveTicket(ticket.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    {statusIcon(ticket.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{ticket.subject}</p>
                      <p className="text-2xs text-muted-foreground">{new Date(ticket.updated_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="secondary" className="text-2xs">{ticket.status}</Badge>
                    {mode === "seller" && ticket.status === "open" && (
                      <Button size="sm" variant="outline" className="h-6 text-2xs ml-1" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: ticket.id, status: "resolved" }); }}>
                        Resolve
                      </Button>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
