import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, ShieldAlert, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type ErrorCategory = "network" | "server" | "auth" | "not_found" | "generic";

interface ErrorRecoveryProps {
  error?: Error | string | null;
  category?: ErrorCategory;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

const ERROR_CONFIG: Record<ErrorCategory, {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  suggestion: string;
  iconBg: string;
  iconColor: string;
}> = {
  network: {
    icon: WifiOff,
    title: "Connexion interrompue",
    description: "Impossible de se connecter au serveur.",
    suggestion: "Vérifiez votre connexion internet et réessayez.",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  server: {
    icon: ServerCrash,
    title: "Erreur du serveur",
    description: "Le serveur a rencontré un problème temporaire.",
    suggestion: "Veuillez patienter quelques instants puis réessayer.",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
  auth: {
    icon: ShieldAlert,
    title: "Session expirée",
    description: "Votre session a expiré ou vous n'avez plus accès.",
    suggestion: "Reconnectez-vous pour continuer.",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  not_found: {
    icon: HelpCircle,
    title: "Page introuvable",
    description: "Le contenu demandé n'existe pas ou a été déplacé.",
    suggestion: "Vérifiez l'adresse ou retournez à l'accueil.",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  generic: {
    icon: AlertTriangle,
    title: "Une erreur est survenue",
    description: "Quelque chose ne s'est pas passé comme prévu.",
    suggestion: "Réessayez dans quelques instants.",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
};

function detectCategory(error?: Error | string | null): ErrorCategory {
  if (!error) return "generic";
  const msg = typeof error === "string" ? error : error.message;
  const lower = msg.toLowerCase();

  if (lower.includes("network") || lower.includes("fetch") || lower.includes("offline") || lower.includes("timeout") || lower.includes("econnrefused")) {
    return "network";
  }
  if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("jwt") || lower.includes("session")) {
    return "auth";
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return "not_found";
  }
  if (lower.includes("500") || lower.includes("502") || lower.includes("503") || lower.includes("server")) {
    return "server";
  }
  return "generic";
}

const ErrorRecovery = ({
  error,
  category,
  onRetry,
  className,
  compact = false,
}: ErrorRecoveryProps) => {
  const resolvedCategory = category || detectCategory(error);
  const config = ERROR_CONFIG[resolvedCategory];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-3" : "py-12 px-4",
        className,
      )}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
        className={cn(
          "rounded-2xl flex items-center justify-center mb-4",
          config.iconBg,
          compact ? "w-11 h-11" : "w-14 h-14",
        )}
      >
        <Icon className={cn(config.iconColor, compact ? "h-5 w-5" : "h-7 w-7")} />
      </motion.div>

      <h3 className={cn("font-semibold text-foreground mb-1", compact ? "text-sm" : "text-base")}>
        {config.title}
      </h3>
      <p className={cn("text-muted-foreground max-w-sm", compact ? "text-xs" : "text-sm")}>
        {config.description}
      </p>
      <p className={cn("text-muted-foreground/70 max-w-sm mt-1", compact ? "text-[0.625rem]" : "text-xs")}>
        {config.suggestion}
      </p>

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-2">
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      )}
    </motion.div>
  );
};

export { ErrorRecovery, detectCategory };
export type { ErrorRecoveryProps, ErrorCategory };
