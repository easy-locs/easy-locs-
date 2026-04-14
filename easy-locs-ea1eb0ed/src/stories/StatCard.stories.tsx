import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, Users, ShoppingBag, Home, TrendingUp, Clock } from "lucide-react";

const meta: Meta<typeof StatCard> = {
  title: "Dashboard/StatCard",
  component: StatCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ padding: 24, background: "hsl(226 24% 14%)", minHeight: 200, maxWidth: 320 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Revenue: Story = {
  args: {
    icon: DollarSign,
    label: "Revenue",
    value: "$12,450",
    sub: "+8.2% this month",
    path: "/dashboard/finances",
  },
};

export const Tenants: Story = {
  args: {
    icon: Users,
    label: "Active Tenants",
    value: "24",
    sub: "3 pending",
    path: "/dashboard/tenants",
  },
};

export const Properties: Story = {
  args: {
    icon: Home,
    label: "Properties",
    value: "7",
    path: "/dashboard",
  },
};

export const Orders: Story = {
  args: {
    icon: ShoppingBag,
    label: "Orders Today",
    value: "38",
    sub: "12 in progress",
    path: "/merchant/orders",
  },
};

export const Loading: Story = {
  args: {
    icon: TrendingUp,
    label: "Growth Rate",
    value: "—",
    loading: true,
  },
};

export const Grid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 600 }}>
      <StatCard icon={DollarSign} label="Revenue" value="$12,450" sub="+8%" path="/dashboard/finances" />
      <StatCard icon={Users} label="Tenants" value="24" path="/dashboard/tenants" />
      <StatCard icon={Home} label="Properties" value="7" path="/dashboard" />
      <StatCard icon={Clock} label="Avg Response" value="2.4h" sub="-15%" />
    </div>
  ),
};
