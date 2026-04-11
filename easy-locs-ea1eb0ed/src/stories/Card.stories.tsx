import type { Meta, StoryObj } from "@storybook/react";
import { AppCard } from "@/components/ui/AppCard";

const meta: Meta<typeof AppCard> = {
  title: "UI/Card",
  component: AppCard,
  argTypes: {
    variant: {
      control: "select",
      options: ["base", "interactive", "settings", "elevated", "kpi"],
    },
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg"],
    },
    status: {
      control: "select",
      options: [undefined, "active", "warning", "error", "idle"],
    },
    glow: { control: "boolean" },
    loading: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, background: "hsl(220 40% 18%)", minHeight: 200, maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AppCard>;

export const Base: Story = {
  args: {
    variant: "base",
    children: (
      <div>
        <p className="text-sm font-semibold text-foreground">Base Card</p>
        <p className="text-xs text-muted-foreground mt-1">Default card with standard border and background</p>
      </div>
    ),
  },
};

export const Interactive: Story = {
  args: {
    variant: "interactive",
    children: (
      <div>
        <p className="text-sm font-semibold text-foreground">Interactive Card</p>
        <p className="text-xs text-muted-foreground mt-1">Click me — scales on press</p>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: "elevated",
    children: (
      <div>
        <p className="text-sm font-semibold text-foreground">Elevated Card</p>
        <p className="text-xs text-muted-foreground mt-1">Shadow-elevated for prominence</p>
      </div>
    ),
  },
};

export const Settings: Story = {
  args: {
    variant: "settings",
    children: (
      <div>
        <p className="text-sm font-semibold text-foreground">Settings Card</p>
        <p className="text-xs text-muted-foreground mt-1">Backdrop-blur with transparency</p>
      </div>
    ),
  },
};

export const KPI: Story = {
  args: {
    variant: "kpi",
    children: (
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Revenue</p>
        <p className="text-2xl font-bold text-foreground mt-1">$12,450</p>
        <p className="text-xs text-emerald-400 mt-1">+8.2% vs last month</p>
      </div>
    ),
  },
};

export const WithStatus: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(["active", "warning", "error", "idle"] as const).map(s => (
        <AppCard key={s} variant="base" status={s}>
          <p className="text-sm font-medium text-foreground">Status: {s}</p>
        </AppCard>
      ))}
    </div>
  ),
};

export const Loading: Story = {
  args: {
    variant: "kpi",
    loading: true,
    children: (
      <div>
        <p className="text-[11px] text-muted-foreground">Loading…</p>
        <p className="text-2xl font-bold text-foreground mt-1">—</p>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(["base", "interactive", "settings", "elevated", "kpi"] as const).map(v => (
        <AppCard key={v} variant={v}>
          <p className="text-sm font-medium text-foreground">{v.charAt(0).toUpperCase() + v.slice(1)} variant</p>
        </AppCard>
      ))}
    </div>
  ),
};
