import { useState } from "react";
import {
  Bell, Eye, MessageSquare, LogOut, Languages, Trash2, AlertTriangle,
  Key, HardDrive, HelpCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useUsername } from "@/hooks/useUsername";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import YouIdentityCard from "@/components/orbit/you/YouIdentityCard";
import YouSmartSettingCard from "@/components/orbit/you/YouSmartSettingCard";
import { useYouSummaries } from "@/hooks/orbit/useYouSummaries";

import YouEditProfilePage from "@/components/orbit/you/subpages/YouEditProfilePage";
import YouNotificationsPage from "@/components/orbit/you/subpages/YouNotificationsPage";
import YouPrivacyPage from "@/components/orbit/you/subpages/YouPrivacyPage";
import YouChatDefaultsPage from "@/components/orbit/you/subpages/YouChatDefaultsPage";
import YouMediaPage from "@/components/orbit/you/subpages/YouMediaPage";

type SubPage = "main" | "edit-profile" | "notifications" | "privacy" | "chats" | "media" | "language" | "account" | "help";

export default function OrbitAccountSection() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [subPage, setSubPage] = useState<SubPage>("main");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { username } = useUsername();
  const summaries = useYouSummaries();
  const orbitIdentity = useOrbitIdentity();
  const { locale, setLocale, availableLocales, t } = useI18n();

  const displayName = orbitIdentity?.displayName
    || user?.user_metadata?.full_name
    || user?.user_metadata?.display_name
    || "";
  const avatarUrl = orbitIdentity?.avatarUrl
    || user?.user_metadata?.avatar_url
    || "";
  const shortId = (user?.id || "").replace(/-/g, "").substring(0, 8).toUpperCase();

  const goBack = () => setSubPage("main");

  if (subPage === "edit-profile") return <YouEditProfilePage onBack={goBack} />;
  if (subPage === "notifications") return <YouNotificationsPage onBack={goBack} />;
  if (subPage === "privacy") return <YouPrivacyPage onBack={goBack} />;
  if (subPage === "chats") return <YouChatDefaultsPage onBack={goBack} />;
  if (subPage === "media") return <YouMediaPage onBack={goBack} />;
  if (subPage === "account") return (
    <div className="flex-1 overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={goBack} className="text-sm font-medium" style={{ color: "hsl(38 65% 56%)" }}>{t("orbit.you.back")}</button>
        <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.account") || "Account"}</span>
      </div>
      <div className="px-3 space-y-3">
        <div className="rounded-2xl p-4" style={{ background: "hsl(var(--muted) / 0.25)", border: "1px solid hsl(var(--border) / 0.5)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>{t("orbit.you.email") || "Email"}</p>
          <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{user?.email || "—"}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "hsl(var(--muted) / 0.25)", border: "1px solid hsl(var(--border) / 0.5)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>{t("orbit.you.user_id") || "User ID"}</p>
          <p className="text-sm font-mono" style={{ color: "hsl(var(--foreground))" }}>{user?.id?.slice(0, 12) || "—"}...</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "hsl(var(--muted) / 0.25)", border: "1px solid hsl(var(--border) / 0.5)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>{t("orbit.you.joined") || "Joined"}</p>
          <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</p>
        </div>
      </div>
    </div>
  );

  if (subPage === "help") return (
    <div className="flex-1 overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={goBack} className="text-sm font-medium" style={{ color: "hsl(38 65% 56%)" }}>{t("orbit.you.back")}</button>
        <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.help") || "Help"}</span>
      </div>
      <div className="px-3 space-y-3">
        <div className="rounded-2xl p-4" style={{ background: "hsl(var(--muted) / 0.25)", border: "1px solid hsl(var(--border) / 0.5)" }}>
          <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.help.faq") || "Frequently Asked Questions"}</p>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{t("orbit.help.faq_desc") || "Find answers to common questions"}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "hsl(var(--muted) / 0.25)", border: "1px solid hsl(var(--border) / 0.5)" }}>
          <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.help.contact_us") || "Contact Us"}</p>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{t("orbit.help.contact_desc") || "Get in touch with our support team"}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "hsl(var(--muted) / 0.25)", border: "1px solid hsl(var(--border) / 0.5)" }}>
          <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.help.terms") || "Terms & Privacy"}</p>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{t("orbit.help.terms_desc") || "Review our terms and privacy policy"}</p>
        </div>
      </div>
    </div>
  );

  if (subPage === "language") return (
    <div className="flex-1 overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={goBack} className="text-sm font-medium" style={{ color: "hsl(38 65% 56%)" }}>{t("orbit.you.back")}</button>
        <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.language")}</span>
      </div>
      <div className="px-3 space-y-1">
        {availableLocales.map(l => (
          <button key={l.value} onClick={() => { setLocale(l.value); haptic("selection"); toast.success(t("orbit.you.language_set", { lang: l.label })); }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
            style={{
              background: locale === l.value ? "hsl(38 65% 56% / 0.1)" : "transparent",
              color: locale === l.value ? "hsl(38 65% 56%)" : "hsl(var(--foreground))",
            }}>
            <span className="text-sm font-medium">{l.label}</span>
            {locale === l.value && <span className="text-xs" style={{ color: "hsl(38 65% 56%)" }}>&#10003;</span>}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <YouIdentityCard
        avatarUrl={avatarUrl}
        displayName={displayName}
        email=""
        username={username}
        shortId={shortId}
        onEditProfile={() => setSubPage("edit-profile")}
      />

      <div className="px-3 py-1.5">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "hsl(var(--muted) / 0.25)", border: "1px solid hsl(var(--border) / 0.5)" }}
        >
          <YouSmartSettingCard icon={Key} label={t("orbit.you.account") || "Account"} summary={t("orbit.you.account_desc") || "Security, change number"} onClick={() => { haptic("light"); setSubPage("account"); }} />
          <YouSmartSettingCard icon={Eye} label={t("orbit.you.privacy")} summary={summaries.privacySummary} onClick={() => setSubPage("privacy")} />
          <YouSmartSettingCard icon={Bell} label={t("orbit.you.notifications")} summary={summaries.notifSummary} onClick={() => setSubPage("notifications")} />
          <YouSmartSettingCard icon={MessageSquare} label={t("orbit.you.chats_setting") || "Chats"} summary={summaries.chatDefaultsSummary} onClick={() => setSubPage("chats")} />
          <YouSmartSettingCard icon={HardDrive} label={t("orbit.you.storage") || "Storage"} summary={t("orbit.you.storage_desc") || "Network usage, auto-download"} onClick={() => setSubPage("media")} />
          <YouSmartSettingCard icon={Languages} label={t("orbit.you.language")} summary={availableLocales.find(l => l.value === locale)?.label || locale} onClick={() => setSubPage("language")} />
          <YouSmartSettingCard icon={HelpCircle} label={t("orbit.you.help") || "Help"} summary={t("orbit.you.help_desc") || "FAQ, contact us"} onClick={() => { haptic("light"); setSubPage("help"); }} />
        </div>
      </div>

      <div className="px-3 pt-3 pb-2 space-y-1">
        <button
          onClick={async () => { haptic("medium"); await signOut(); navigate("/login"); }}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors text-left hover:bg-destructive/5 active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--destructive) / 0.1)" }}>
            <LogOut className="h-[18px] w-[18px]" style={{ color: "hsl(var(--destructive))" }} />
          </div>
          <p className="text-[14px] font-medium truncate" style={{ color: "hsl(var(--destructive))" }}>{t("orbit.you.logout")}</p>
        </button>

        <button
          onClick={() => { haptic("warning"); setShowDeleteConfirm(true); }}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors text-left hover:bg-destructive/5 active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--destructive) / 0.08)" }}>
            <Trash2 className="h-[18px] w-[18px]" style={{ color: "hsl(var(--destructive) / 0.7)" }} />
          </div>
          <p className="text-[14px] font-medium truncate" style={{ color: "hsl(var(--destructive) / 0.7)" }}>{t("orbit.you.delete_account")}</p>
        </button>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-xs" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: "hsl(var(--destructive))" }}>
              <AlertTriangle className="h-5 w-5" /> {t("orbit.you.delete_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
              {t("orbit.you.delete_warning")}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}>
                {t("orbit.contacts.cancel")}
              </button>
              <button onClick={async () => {
                haptic("error");
                toast.success(t("orbit.you.delete_requested"));
                setShowDeleteConfirm(false);
                await signOut();
                navigate("/login");
              }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                style={{ background: "hsl(var(--destructive))", color: "white" }}>
                {t("orbit.you.delete_confirm")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="text-center pb-8 pt-2">
        <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>{t("orbit.version")}</p>
      </div>
    </div>
  );
}
