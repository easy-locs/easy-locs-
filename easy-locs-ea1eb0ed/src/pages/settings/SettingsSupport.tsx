/**
 * SettingsSupport — Help & Support page with ticket access.
 * Route: /settings/support
 */
import { useNavigate } from "react-router-dom";
import { Headphones, MessageCircle, FileText, Ticket } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const SUPPORT_OPTIONS = [
  { icon: Ticket, label: "My Tickets", desc: "View your support requests", path: "/support/tickets" },
  { icon: MessageCircle, label: "Create a Request", desc: "Report an order, payment or delivery issue", path: "/support/tickets" },
  { icon: FileText, label: "FAQ / Help Center", desc: "Answers and guides coming soon", path: "/help" },
];

export default function SettingsSupport() {
  useUiEngine("settings-support");
  const navigate = useNavigate();

  return (
    <SubPageShell title="Help & Support" onBack={() => navigate("/settings")} contentClassName="space-y-5">
      <div className="rounded-2xl overflow-hidden bg-card border border-border/10">
        {SUPPORT_OPTIONS.map((opt, idx) => (
          <button
            key={opt.label}
            onClick={() => navigate(opt.path)}
            className={`w-full px-4 py-3.5 flex items-center gap-3 active:bg-muted/30 transition-colors text-left${idx < SUPPORT_OPTIONS.length - 1 ? " border-b border-border/8" : ""}`}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/8">
              <opt.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{opt.label}</p>
              <p className="text-[0.6875rem] text-muted-foreground">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-4 text-center bg-card border border-border/10">
        <p className="text-sm font-semibold text-foreground">Easy-Locs</p>
        <p className="text-xs text-muted-foreground mt-0.5">Version 1.0.0</p>
      </div>
    </SubPageShell>
  );
}
