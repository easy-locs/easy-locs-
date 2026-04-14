import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Home, User, CreditCard, Calendar, Check, Clock, AlertTriangle } from "lucide-react";

const meta: Meta = {
  title: "UI/List",
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ padding: 24, background: "hsl(226 24% 14%)", minHeight: 400, maxWidth: 420 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj;

const tenants = [
  { name: "Sarah Johnson", unit: "Apt 4B", status: "active", rent: "$1,200/mo" },
  { name: "Mohammed Al-Rashid", unit: "Apt 2A", status: "active", rent: "$950/mo" },
  { name: "Pierre Dupont", unit: "Villa 7", status: "late", rent: "$2,800/mo" },
  { name: "Yuki Tanaka", unit: "Apt 6C", status: "active", rent: "$1,100/mo" },
  { name: "Ana García", unit: "Apt 1D", status: "ending", rent: "$1,350/mo" },
];

export const TenantList: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tenants.map((t, i) => (
        <AppCard key={i} variant="interactive">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-sm font-medium text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.unit} · {t.rent}</p>
            </div>
            <Badge variant={t.status === "active" ? "default" : t.status === "late" ? "destructive" : "secondary"}>
              {t.status}
            </Badge>
          </div>
        </AppCard>
      ))}
    </div>
  ),
};

const payments = [
  { tenant: "Sarah Johnson", amount: "$1,200", date: "Apr 1", status: "paid" },
  { tenant: "Mohammed Al-Rashid", amount: "$950", date: "Apr 1", status: "paid" },
  { tenant: "Pierre Dupont", amount: "$2,800", date: "Apr 1", status: "overdue" },
  { tenant: "Yuki Tanaka", amount: "$1,100", date: "Apr 3", status: "pending" },
];

export const PaymentList: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {payments.map((p, i) => (
        <AppCard key={i} variant="base">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{
              background: p.status === "paid" ? "hsl(142 60% 40% / 0.1)" : p.status === "overdue" ? "hsl(0 70% 50% / 0.1)" : "hsl(var(--accent) / 0.1)"
            }}>
              {p.status === "paid" ? <Check className="w-5 h-5 text-emerald-400" /> : p.status === "overdue" ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <Clock className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />}
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-sm font-medium text-foreground">{p.tenant}</p>
              <p className="text-xs text-muted-foreground">{p.date}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p className="text-sm font-bold text-foreground">{p.amount}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{p.status}</p>
            </div>
          </div>
        </AppCard>
      ))}
    </div>
  ),
};

export const ScrollableList: Story = {
  render: () => (
    <ScrollArea className="h-[300px] rounded-xl border border-border/20 bg-card/50 p-2">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <AppCard key={i} variant="interactive" padding="sm">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Home className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Property {i + 1}</p>
                <p className="text-[11px] text-muted-foreground">Unit {String.fromCharCode(65 + (i % 8))}</p>
              </div>
            </div>
          </AppCard>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <AppCard variant="base">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px", gap: 8 }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
          <Calendar className="w-7 h-7" style={{ color: "hsl(var(--accent))" }} />
        </div>
        <p className="text-sm font-semibold text-foreground">No bookings yet</p>
        <p className="text-xs text-muted-foreground text-center">Your upcoming bookings will appear here</p>
      </div>
    </AppCard>
  ),
};
