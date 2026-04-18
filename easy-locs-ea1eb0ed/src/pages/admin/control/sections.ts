import {
  LayoutDashboard,
  Bot,
  ListTree,
  Terminal,
  Inbox,
  Gauge,
  Cpu,
  Compass,
  ListChecks,
  ShieldAlert,
  BadgeCheck,
  Network,
  type LucideIcon,
} from "lucide-react";

export type ControlSectionId =
  | "overview"
  | "tasks"
  | "agents"
  | "approvals"
  | "watchdog"
  | "proof"
  | "wiring"
  | "runs"
  | "command"
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
  /**
   * Task #1031 (Supreme Admin Dashboard): the 7 P0 modules that form the
   * canonical left rail in the prescribed order. Other sections remain
   * reachable as deep-links inside the shell but are not P0.
   */
  p0?: boolean;
}

/**
 * Rail order is fixed by task #1031 (Supreme Admin Dashboard):
 *   Command Center · Tasks · Agents · Approvals · Watchdog ·
 *   Runtime Proof · Wiring Map.
 * Everything below the divider (runs, command, autonomy, engines,
 * master) is kept reachable as a deep-link from inside the shell.
 */
export const CONTROL_SECTIONS: ControlSection[] = [
  {
    id: "overview",
    label: "Command Center",
    description: "Mission control · live KPIs",
    icon: LayoutDashboard,
    shortcut: "g o",
    ownerAgent: "Supreme",
    p0: true,
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "NL intake · lifecycle · dedup",
    icon: ListChecks,
    shortcut: "g t",
    ownerAgent: "Supreme",
    p0: true,
  },
  {
    id: "agents",
    label: "Agents",
    description: "Hierarchy · status · controls",
    icon: Bot,
    shortcut: "g a",
    ownerAgent: "Supreme",
    p0: true,
  },
  {
    id: "approvals",
    label: "Approvals",
    description: "Inbox · destructive actions",
    icon: Inbox,
    shortcut: "g p",
    ownerAgent: "Supreme",
    p0: true,
  },
  {
    id: "watchdog",
    label: "Watchdog",
    description: "Incidents · stuck · anomaly",
    icon: ShieldAlert,
    shortcut: "g w",
    ownerAgent: "Supreme",
    p0: true,
  },
  {
    id: "proof",
    label: "Runtime Proof",
    description: "Build · auth · routes · health",
    icon: BadgeCheck,
    shortcut: "g f",
    ownerAgent: "Supreme",
    p0: true,
  },
  {
    id: "wiring",
    label: "Wiring Map",
    description: "Routes · services · edge fns",
    icon: Network,
    shortcut: "g i",
    ownerAgent: "Supreme",
    p0: true,
  },
  {
    id: "runs",
    label: "Runs",
    description: "Explorer · replay · trace",
    icon: ListTree,
    shortcut: "g r",
    ownerAgent: "Agent 7",
  },
  {
    id: "command",
    label: "Slash",
    description: "Slash commands · ghost preview",
    icon: Terminal,
    shortcut: "g c",
    ownerAgent: "Agent 8",
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
    label: "Master Index",
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
