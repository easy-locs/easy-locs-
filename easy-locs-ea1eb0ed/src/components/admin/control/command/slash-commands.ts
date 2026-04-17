export type SlashCommandKind = "expansion" | "local";

export interface SlashCommand {
  cmd: string;
  desc: string;
  hint?: string;
  kind: SlashCommandKind;
  expansion?: string;
  localAction?: "clear" | "history" | "help" | "sidebar";
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    cmd: "/health",
    desc: "Platform health overview",
    hint: "Run a full platform health check",
    kind: "expansion",
    expansion: "Show platform health overview",
  },
  {
    cmd: "/support",
    desc: "Support problems",
    hint: "List open support issues",
    kind: "expansion",
    expansion: "Check support problems",
  },
  {
    cmd: "/urgent",
    desc: "Urgent issues",
    hint: "Show currently urgent issues",
    kind: "expansion",
    expansion: "Show urgent issues",
  },
  {
    cmd: "/merchants",
    desc: "Merchant activity",
    hint: "Review recent merchant activity",
    kind: "expansion",
    expansion: "Review merchant activity",
  },
  {
    cmd: "/check",
    desc: "Run a check",
    hint: "/check <area> — e.g. /check payments",
    kind: "expansion",
    expansion: "Run a check on ",
  },
  {
    cmd: "/show",
    desc: "Show data",
    hint: "/show <topic> — e.g. /show fraud alerts",
    kind: "expansion",
    expansion: "Show me ",
  },
  {
    cmd: "/clear",
    desc: "Clear conversation",
    hint: "Wipe the current conversation",
    kind: "local",
    localAction: "clear",
  },
  {
    cmd: "/history",
    desc: "Toggle history panel",
    hint: "Open the command history split view",
    kind: "local",
    localAction: "history",
  },
  {
    cmd: "/agents",
    desc: "Toggle agent sidebar",
    hint: "Show or hide the agent status sidebar",
    kind: "local",
    localAction: "sidebar",
  },
  {
    cmd: "/help",
    desc: "Show all slash commands",
    hint: "List every available slash command",
    kind: "local",
    localAction: "help",
  },
];

export function matchSlashCommands(input: string): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  const head = input.split(/\s+/)[0]?.toLowerCase() ?? "/";
  if (head === "/") return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => c.cmd.startsWith(head));
}

export function expandSlashCommand(input: string): {
  text: string;
  command: SlashCommand | null;
  remainder: string;
} {
  if (!input.startsWith("/")) {
    return { text: input, command: null, remainder: "" };
  }
  const [head, ...rest] = input.split(/\s+/);
  const remainder = rest.join(" ").trim();
  const command = SLASH_COMMANDS.find((c) => c.cmd === head?.toLowerCase()) ?? null;
  if (!command) return { text: input, command: null, remainder };
  if (command.kind === "local") {
    return { text: command.cmd, command, remainder };
  }
  const base = (command.expansion ?? "").replace(/\s+$/, "");
  const text = remainder ? `${base} ${remainder}`.trim() : base.trim();
  return { text, command, remainder };
}
