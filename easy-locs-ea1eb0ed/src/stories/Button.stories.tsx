import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Plus, Trash2, Check, Download } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link", "premium", "success"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, background: "hsl(225 22% 16%)", minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: "Continue", variant: "default" },
};

export const Premium: Story = {
  args: { children: "Upgrade to Pro", variant: "premium", size: "lg" },
};

export const Destructive: Story = {
  args: { children: "Delete", variant: "destructive" },
};

export const Outline: Story = {
  args: { children: "Cancel", variant: "outline" },
};

export const Secondary: Story = {
  args: { children: "Secondary", variant: "secondary" },
};

export const Ghost: Story = {
  args: { children: "Ghost Action", variant: "ghost" },
};

export const Success: Story = {
  args: { children: "Confirm", variant: "success" },
};

export const Loading: Story = {
  args: { children: "Saving…", variant: "default", loading: true },
};

export const Disabled: Story = {
  args: { children: "Submit", variant: "default", disabled: true },
};

export const WithIcon: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button variant="default"><Mail className="w-4 h-4" /> Send Email</Button>
      <Button variant="premium"><ArrowRight className="w-4 h-4" /> Get Started</Button>
      <Button variant="success"><Check className="w-4 h-4" /> Approve</Button>
      <Button variant="destructive"><Trash2 className="w-4 h-4" /> Remove</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Plus className="w-4 h-4" /></Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(["default", "premium", "destructive", "outline", "secondary", "ghost", "success", "link"] as const).map(v => (
        <Button key={v} variant={v}>{v.charAt(0).toUpperCase() + v.slice(1)} Button</Button>
      ))}
    </div>
  ),
};
