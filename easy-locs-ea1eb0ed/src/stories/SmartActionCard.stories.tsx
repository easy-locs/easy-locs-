import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { SmartActionCard } from "@/components/ui/SmartActionCard";
import { FileText, Users, CreditCard, Wrench, CalendarDays, Receipt, Home, Package } from "lucide-react";

const meta: Meta<typeof SmartActionCard> = {
  title: "Dashboard/SmartActionCard",
  component: SmartActionCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ padding: 24, background: "hsl(220 40% 18%)", minHeight: 200, maxWidth: 400 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SmartActionCard>;

export const WithCount: Story = {
  args: {
    icon: FileText,
    label: "Documents",
    path: "/dashboard/documents",
    count: 12,
  },
};

export const WithSub: Story = {
  args: {
    icon: CreditCard,
    label: "Payments",
    path: "/dashboard/rental-management",
    count: 3,
    sub: "2 overdue",
  },
};

export const ZeroCount: Story = {
  args: {
    icon: Wrench,
    label: "Interventions",
    path: "/dashboard/interventions",
    count: 0,
  },
};

export const Loading: Story = {
  args: {
    icon: CalendarDays,
    label: "Bookings",
    path: "/dashboard/seasonal-rentals",
    count: 5,
    loading: true,
  },
};

export const NoCount: Story = {
  args: {
    icon: Home,
    label: "Properties",
    path: "/dashboard",
  },
};

export const DashboardGrid: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <SmartActionCard icon={Users} label="Tenants" path="/dashboard/tenants" count={24} />
      <SmartActionCard icon={FileText} label="Leases" path="/dashboard/leases" count={8} />
      <SmartActionCard icon={CreditCard} label="Payments" path="/dashboard/rental-management" count={3} sub="2 overdue" />
      <SmartActionCard icon={Wrench} label="Interventions" path="/dashboard/interventions" count={0} />
      <SmartActionCard icon={Receipt} label="Receipts" path="/dashboard/receipts" count={15} />
      <SmartActionCard icon={Package} label="Inventory" path="/dashboard" />
    </div>
  ),
};
