/**
 * CommPlaceholderSection — Placeholder for future communication sections.
 * HUD-themed with consistent design tokens. Fully i18n'd.
 */
import { Video, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import type { CommSection } from "./CommNavBar";

const SECTION_META: Record<string, { icon: typeof Video; titleKey: string; descKey: string; fallbackTitle: string; fallbackDesc: string }> = {
  meetings: { icon: Video, titleKey: "orbit.placeholder.meetings", fallbackTitle: "Meetings", descKey: "orbit.placeholder.meetings_desc", fallbackDesc: "Scheduled meetings and video rooms" },
  files: { icon: FolderOpen, titleKey: "orbit.placeholder.files", fallbackTitle: "Files", descKey: "orbit.placeholder.files_desc", fallbackDesc: "Shared files from all conversations" },
};

interface Props {
  section: CommSection;
}

export default function CommPlaceholderSection({ section }: Props) {
  const { t } = useI18n();
  const meta = SECTION_META[section];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "hsl(var(--hud-bg))" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-xs px-6"
      >
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
          {t(meta.titleKey) || meta.fallbackTitle}
        </h3>
        <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim))" }}>
          {t(meta.descKey) || meta.fallbackDesc}
        </p>
        <div
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider"
          style={{
            background: "hsl(var(--hud-cyan) / 0.08)",
            border: "1px solid hsl(var(--hud-cyan) / 0.15)",
            color: "hsl(var(--hud-cyan) / 0.7)",
          }}
        >
          {t("orbit.placeholder.coming_soon") || "Coming soon"}
        </div>
      </motion.div>
    </div>
  );
}
