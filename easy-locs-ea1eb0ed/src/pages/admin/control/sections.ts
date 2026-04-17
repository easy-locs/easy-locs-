import {
  LayoutDashboard,
  Bot,
  ListTree,
  Terminal,
  Inbox,
  Gauge,
  Cpu,
  Compass,
  type LucideIcon,
} from "lucide-react";

export type ControlSectionId =
  | "overview"
  | "agents"
  | "runs"
  | "command"
  | "approvals"
  | "autonomy"
  | "engines"
  | "master";

export interface ControlSection {
  id: ControlSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  shortcut?: string;
  ownerAgent: string;
}

export const CONTROL_SECTIONS: ControlSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Mission control · KPIs live",
    icon: LayoutDashboard,
    shortcut: "g o",
    ownerAgent: "Agent 5",
  },
  {
    id: "agents",
    label: "Agents",
    description: "Cockpit · status · logs live",
    icon: Bot,
    shortcut: "g a",
    ownerAgent: "Agent 6",
  },
  {
    id: "runs",
    label: "Runs",
    description: "Explorer · replay · trace/DAG",
    icon: ListTree,
    shortcut: "g r",
    ownerAgent: "Agent 7",
  },
  {
    id: "command",
    label: "Command",
    description: "Slash commands · ghosting",
    icon: Terminal,
    shortcut: "g c",
    ownerAgent: "Agent 8",
  },
  {
    id: "approvals",
    label: "Approvals",
    description: "Inbox · DLQ",
    icon: Inbox,
    shortcut: "g p",
    ownerAgent: "Agent 9",
  },
  {
    id: "autonomy",
    label: "Autonomy",
    description: "Levels · guardrails",
    icon: Gauge,
    shortcut: "g u",
    ownerAgent: "Agent 9",
  },
  {
    id: "engines",
    label: "Engines",
    description: "Workers · queues",
    icon: Cpu,
    shortcut: "g e",
    ownerAgent: "Agent 9",
  },
  {
    id: "master",
    label: "Master",
    description: "Legacy admin index",
    icon: Compass,
    shortcut: "g m",
    ownerAgent: "Shell",
  },
];

export const DEFAULT_SECTION: ControlSectionId = "overview";

export function isControlSectionId(value: string | undefined | null): value is ControlSectionId {
  if (!value) return false;
  return CONTROL_SECTIONS.some((s) => s.id === value);
}

export function getSection(id: ControlSectionId): ControlSection {
  return CONTROL_SECTIONS.find((s) => s.id === id) ?? CONTROL_SECTIONS[0];
}
