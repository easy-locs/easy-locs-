import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { addSupportTicketMessage, createSupportTicket, resolveSupportTicket } from "@/lib/support/tickets";

export default function SupportInboxPage() {
  const [ticket, setTicket] = useState<any>(null);

  const create = async () => {
    const t = await createSupportTicket({
      ticketType: "merchant",
      priority: "high",
      subject: "Store not visible",
      firstMessage: "My store is not visible in the marketplace after onboarding.",
    });
    setTicket(t);
  };

  const reply = async () => {
    if (!ticket) return;
    await addSupportTicketMessage({
      ticketId: ticket.id,
      senderRole: "user",
      body: "Additional details: this happened after menu import.",
    });
  };

  const resolve = async () => {
    if (!ticket) return;
    const done = await resolveSupportTicket(ticket.id);
    setTicket(done);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Support Inbox</h1>
        <p className="text-sm text-muted-foreground">Tickets for customer, merchant, driver, finance, tech</p>
      </div>

      <div className="flex gap-2">
        <button onClick={create} className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold">Create ticket</button>
        <button onClick={reply} disabled={!ticket} className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-xl text-sm font-semibold disabled:opacity-50">Add message</button>
        <button onClick={resolve} disabled={!ticket} className="flex-1 bg-accent text-accent-foreground py-2 rounded-xl text-sm font-semibold disabled:opacity-50">Resolve</button>
      </div>

      {!!ticket && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-sm font-medium text-foreground">ticket: {ticket.subject}</p>
          <p className="text-xs text-muted-foreground">status: {ticket.status}</p>
          <p className="text-xs text-muted-foreground">priority: {ticket.priority}</p>
        </div>
      )}
    </div>
  );
}
