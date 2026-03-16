/**
 * FeatureTooltip — Contextual help tooltip for dashboard features.
 * Shows a brief explanation with an optional "Learn more" link.
 * Dismissable per-user via localStorage.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeatureTooltipProps {
  /** Unique key for localStorage persistence */
  featureKey: string;
  /** Short title */
  title: string;
  /** Helpful description */
  description: string;
  /** Optional link */
  learnMoreUrl?: string;
  /** Tooltip side */
  side?: "top" | "bottom" | "left" | "right";
  /** Show as a pulsing dot for first-time users */
  pulse?: boolean;
  /** Custom trigger element instead of the default help icon */
  children?: React.ReactNode;
}

export function FeatureTooltip({
  featureKey,
  title,
  description,
  learnMoreUrl,
  side = "bottom",
  pulse = false,
  children,
}: FeatureTooltipProps) {
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    const key = `easylocs_tip_${featureKey}`;
    setSeen(localStorage.getItem(key) === "seen");
  }, [featureKey]);

  const markSeen = () => {
    localStorage.setItem(`easylocs_tip_${featureKey}`, "seen");
    setSeen(true);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="relative inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={markSeen}
          >
            {children ?? <HelpCircle className="h-4 w-4" />}
            <AnimatePresence>
              {pulse && !seen && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent"
                >
                  <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs p-3 bg-popover border border-border rounded-xl shadow-lg"
        >
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              {!seen && (
                <button
                  onClick={markSeen}
                  className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline inline-block mt-1"
              >
                En savoir plus →
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Pre-configured tooltips for common features.
 */
export const FEATURE_TIPS = {
  properties: {
    featureKey: "properties",
    title: "Gestion des biens",
    description: "Ajoutez vos propriétés pour gérer les baux, loyers, et documents associés. Chaque bien peut avoir plusieurs lots et locataires.",
  },
  orbit: {
    featureKey: "orbit",
    title: "Centre Orbit",
    description: "Communiquez avec vos locataires et partenaires en temps réel. Messages chiffrés, appels audio/vidéo, et partage de fichiers.",
  },
  wallet: {
    featureKey: "wallet",
    title: "Wallet LOCS",
    description: "Votre portefeuille intégré pour gérer les paiements, transferts, et suivre vos finances en toute sécurité.",
  },
  marketplace: {
    featureKey: "marketplace",
    title: "Marketplace",
    description: "Publiez vos services de conciergerie et louez vos biens saisonniers sur la marketplace Easy-Locs.",
  },
  documents: {
    featureKey: "documents",
    title: "Documents intelligents",
    description: "Générez automatiquement baux, quittances, et états des lieux. Signature électronique intégrée.",
  },
  audit: {
    featureKey: "audit",
    title: "Score de qualité",
    description: "L'IA analyse votre plateforme sur 15 critères (SEO, UX, sécurité…) et vous propose des améliorations.",
  },
} as const;
