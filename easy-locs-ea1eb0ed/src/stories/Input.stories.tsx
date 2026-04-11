import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  decorators: [
    (Story) => (
      <div style={{ padding: 24, background: "hsl(220 40% 18%)", minHeight: 200, maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Enter your name…" },
};

export const Email: Story = {
  args: { type: "email", placeholder: "name@example.com" },
};

export const Password: Story = {
  args: { type: "password", placeholder: "••••••••" },
};

export const Disabled: Story = {
  args: { placeholder: "Cannot edit", disabled: true },
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone Number</Label>
      <Input id="phone" type="tel" placeholder="+971 50 123 4567" />
    </div>
  ),
};

export const TextareaStory: Story = {
  name: "Textarea",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label className="text-sm font-medium text-foreground">Description</Label>
      <Textarea placeholder="Tell us about your property…" rows={4} />
    </div>
  ),
};

export const FormGroup: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Label className="text-sm font-medium text-foreground">Full Name</Label>
        <Input placeholder="John Doe" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Label className="text-sm font-medium text-foreground">Email</Label>
        <Input type="email" placeholder="john@example.com" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Label className="text-sm font-medium text-foreground">Notes</Label>
        <Textarea placeholder="Additional information…" rows={3} />
      </div>
    </div>
  ),
};
