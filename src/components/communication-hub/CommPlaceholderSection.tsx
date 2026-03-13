/**
 * CommPlaceholderSection — Placeholder for future communication sections.
 * HUD-themed with consistent design tokens.
 */
import { Phone, Users, UsersRound, Video, FolderOpen, Settings } from "lucide-react";
import { motion } from "framer-motion";
import type { CommSection } from "./CommNavBar";

const SECTION_META: Record<string, { icon: typeof Phone; title: string; subtitle: string }> = {
  calls: { icon: Phone, title: "Appels", subtitle: "L'historique des appels vocaux et vidéo apparaîtra ici" },
  contacts: { icon: Users, title: "Contacts", subtitle: "Votre répertoire de contacts professionnels" },
  groups: { icon: UsersRound, title: "Groupes", subtitle: "Conversations d'équipe et de groupe" },
  meetings: { icon: Video, title: "Réunions", subtitle: "Réunions planifiées et salles vidéo" },
  files: { icon: FolderOpen, title: "Fichiers", subtitle: "Fichiers partagés dans toutes les conversations" },
  settings: { icon: Settings, title: "Paramètres", subtitle: "Préférences de communication et sécurité" },
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
          Bientôt disponible
        </div>
      </motion.div>
    </div>
  );
}
