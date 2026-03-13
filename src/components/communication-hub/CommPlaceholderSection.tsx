/**
 * CommPlaceholderSection — Placeholder for future communication sections.
 */
import { Phone, Users, UsersRound, Video, FolderOpen, Settings } from "lucide-react";
import type { CommSection } from "./CommNavBar";

const SECTION_META: Record<string, { icon: typeof Phone; title: string; subtitle: string }> = {
  calls: { icon: Phone, title: "Calls", subtitle: "Voice & video call history will appear here" },
  contacts: { icon: Users, title: "Contacts", subtitle: "Your business contacts directory" },
  groups: { icon: UsersRound, title: "Groups", subtitle: "Team and group conversations" },
  meetings: { icon: Video, title: "Meetings", subtitle: "Scheduled meetings and video rooms" },
  files: { icon: FolderOpen, title: "Files", subtitle: "Shared files across all conversations" },
  settings: { icon: Settings, title: "Settings", subtitle: "Communication preferences and security" },
};

interface Props {
  section: CommSection;
}

export default function CommPlaceholderSection({ section }: Props) {
  const meta = SECTION_META[section];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "hsl(var(--hud-bg))" }}>
      <div className="text-center max-w-xs px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: "hsl(var(--hud-surface))",
            border: "1px solid hsl(var(--hud-border) / 0.15)",
            boxShadow: "0 0 20px hsl(var(--hud-cyan) / 0.08)",
          }}
        >
          <Icon className="h-7 w-7" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }} />
        </div>
        <h3 className="text-base font-bold mb-1" style={{ color: "hsl(var(--hud-text))" }}>
          {meta.title}
        </h3>
        <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim))" }}>
          {meta.subtitle}
        </p>
        <div
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider"
          style={{
            background: "hsl(var(--hud-cyan) / 0.08)",
            border: "1px solid hsl(var(--hud-cyan) / 0.15)",
            color: "hsl(var(--hud-cyan) / 0.7)",
          }}
        >
          Coming soon
        </div>
      </div>
    </div>
  );
}
