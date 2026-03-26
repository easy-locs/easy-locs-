/**
 * SettingsSupport — Help & Support page with ticket access.
 * Route: /settings/support
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Headphones, MessageCircle, FileText, Ticket } from "lucide-react";

const SUPPORT_OPTIONS = [
  { icon: Ticket, label: "My Tickets", desc: "View your support requests", path: "/support/tickets" },
  { icon: MessageCircle, label: "Create a Request", desc: "Report an order, payment or delivery issue", path: "/support/tickets" },
  { icon: FileText, label: "FAQ / Help Center", desc: "Answers and guides coming soon", path: "/help" },
];

export default function SettingsSupport() {
  const navigate = useNavigate();

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Help & Support</h1>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-5">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          {SUPPORT_OPTIONS.map((opt, idx) => (
            <button
              key={opt.label}
              onClick={() => navigate(opt.path)}
              className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-muted/30 transition-colors text-left"
              style={idx < SUPPORT_OPTIONS.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.08)" } : undefined}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--primary) / 0.08)" }}
              >
                <opt.icon className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          <p className="text-sm font-semibold text-foreground">Easy-Locs</p>
          <p className="text-xs text-muted-foreground mt-0.5">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
