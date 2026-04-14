import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Settings } from "lucide-react";

const meta: Meta<typeof MobilePageHeader> = {
  title: "Dashboard/MobilePageHeader",
  component: MobilePageHeader,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ background: "hsl(225 22% 16%)", minHeight: 200, maxWidth: 420 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MobilePageHeader>;

export const Simple: Story = {
  args: {
    title: "Documents",
    showBack: true,
  },
};

export const WithSubtitle: Story = {
  args: {
    title: "Tenants",
    subtitle: "24 active",
    showBack: true,
  },
};

export const WithActions: Story = {
  args: {
    title: "Properties",
    showBack: true,
    actions: (
      <div style={{ display: "flex", gap: 4 }}>
        <Button size="icon" variant="ghost"><Filter className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost"><Plus className="w-4 h-4" /></Button>
      </div>
    ),
  },
};

export const NoBack: Story = {
  args: {
    title: "Dashboard",
    showBack: false,
    actions: <Button size="icon" variant="ghost"><Settings className="w-4 h-4" /></Button>,
  },
};

export const WithIcon: Story = {
  args: {
    title: "Payments",
    subtitle: "Manage your rental payments",
    showBack: true,
    icon: <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.15)" }}><span style={{ color: "hsl(var(--accent))" }}>💰</span></div>,
  },
};
