/**
 * ContactGate — Blocks unauthenticated users from contacting providers.
 * Shows login/signup prompt or app install prompt as needed.
 */
import { useAuth } from "@/contexts/AuthContext";
import { useAppInstalled } from "@/hooks/useAppInstalled";
import { Button } from "@/components/ui/button";
import { LogIn, Download, Phone, Lock, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

interface ContactGateProps {
  /** What action the user is trying (for messaging) */
  action?: "message" | "call" | "reveal_phone" | "whatsapp";
  children: React.ReactNode;
}

export function ContactGate({ action = "message", children }: ContactGateProps) {
  const { user } = useAuth();
  const isInstalled = useAppInstalled();
  const navigate = useNavigate();
  const { t } = useI18n();

  // Not logged in → show login prompt
  if (!user) {
    return (
      <div className="space-y-3 p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="h-4 w-4 text-muted-foreground" />
          {action === "call"
            ? (t("gate.login_to_call") || "Login to call this provider")
            : (t("gate.login_to_contact") || "Login to contact this provider")}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("gate.login_desc") || "Create a free account to send messages, call providers, and access contact information."}
        </p>
        <Button onClick={() => navigate("/login")} className="w-full gap-2 min-h-[44px]">
          <LogIn className="h-4 w-4" />
          {t("gate.login_signup") || "Login / Sign up"}
        </Button>
      </div>
    );
  }

  // Logged in but trying to call from web (not installed app)
  if (action === "call" && !isInstalled) {
    return (
      <div className="space-y-3 p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Phone className="h-4 w-4 text-accent" />
          {t("gate.install_to_call") || "Install the app to call for free"}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("gate.install_desc") || "Download the Easy-Locs app to unlock free calls to providers and full contact features."}
        </p>
        <Button onClick={() => navigate("/install")} variant="outline" className="w-full gap-2 min-h-[44px]">
          <Download className="h-4 w-4" />
          {t("gate.install_app") || "Install the app"}
        </Button>
      </div>
    );
  }

  // Logged in → show children (contact buttons)
  return <>{children}</>;
}

/** Inline gate for a single button — returns true if user should be blocked */
export function useContactGate() {
  const { user } = useAuth();
  const isInstalled = useAppInstalled();
  const navigate = useNavigate();

  const requireAuth = (action: "message" | "call" | "whatsapp" | "reveal_phone" = "message"): boolean => {
    if (!user) {
      navigate("/login");
      return true; // blocked
    }
    if (action === "call" && !isInstalled) {
      navigate("/install");
      return true; // blocked
    }
    return false; // allowed
  };

  return { user, isInstalled, requireAuth };
}
