/**
 * SettingsSupport — Help & Support page.
 * Route: /settings/support
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Headphones, MessageCircle, Mail, FileText, ExternalLink } from "lucide-react";

const SUPPORT_OPTIONS = [
  { icon: MessageCircle, label: "Live Chat", desc: "Chat with our support team", action: "chat" },
  { icon: Mail, label: "Email Support", desc: "support@easy-locs.com", action: "email" },
  { icon: FileText, label: "FAQ", desc: "Frequently asked questions", action: "faq" },
  { icon: ExternalLink, label: "Help Center", desc: "Browse help articles", action: "help" },
];

export default function SettingsSupport() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Help & Support</h1>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-5">
        {/* Contact options */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          {SUPPORT_OPTIONS.map((opt, idx) => (
            <button
              key={opt.action}
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

        {/* App info */}
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
