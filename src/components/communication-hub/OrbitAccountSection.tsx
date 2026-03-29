/**
 * OrbitAccountSection — "YOU" cockpit inside Orbit hub.
 * Thin shell: identity card + Orbit-only smart summary cards + sub-page routing.
 * No mixed account/security/storage/devices clutter — Orbit communication only.
 */
import { useState } from "react";
import {
  Bell, Eye, Phone, MessageSquare, Wallpaper, ImageIcon,
  BookOpen, MapPin, LogOut,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { useUsername } from "@/hooks/useUsername";
import YouIdentityCard from "@/components/orbit/you/YouIdentityCard";
import YouSmartSettingCard from "@/components/orbit/you/YouSmartSettingCard";
import YouSectionBlock from "@/components/orbit/you/YouSectionBlock";
import { useYouSummaries } from "@/hooks/orbit/useYouSummaries";

// Sub-pages — each owns its own logic
import YouEditProfilePage from "@/components/orbit/you/subpages/YouEditProfilePage";
import YouNotificationsPage from "@/components/orbit/you/subpages/YouNotificationsPage";
import YouCallsPage from "@/components/orbit/you/subpages/YouCallsPage";
import YouPrivacyPage from "@/components/orbit/you/subpages/YouPrivacyPage";
import YouChatDefaultsPage from "@/components/orbit/you/subpages/YouChatDefaultsPage";
import YouLocationPage from "@/components/orbit/you/subpages/YouLocationPage";
import YouBackgroundPage from "@/components/orbit/you/subpages/YouBackgroundPage";
import YouMediaPage from "@/components/orbit/you/subpages/YouMediaPage";
import YouStoriesPage from "@/components/orbit/you/subpages/YouStoriesPage";

type SubPage = "main" | "edit-profile" | "notifications" | "calls" | "privacy" | "chats" | "location" | "background" | "media" | "stories";

export default function OrbitAccountSection() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [subPage, setSubPage] = useState<SubPage>("main");
  const { username } = useUsername();
  const summaries = useYouSummaries();

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.display_name || "";
  const avatarUrl = user?.user_metadata?.avatar_url || "";
  const displayEmail = user?.email || "—";
  const shortId = (user?.id || "").substring(0, 8).toUpperCase();

  const goBack = () => setSubPage("main");

  // ── Sub-page routing ──
  if (subPage === "edit-profile") return <YouEditProfilePage onBack={goBack} />;
  if (subPage === "notifications") return <YouNotificationsPage onBack={goBack} />;
  if (subPage === "calls") return <YouCallsPage onBack={goBack} />;
  if (subPage === "privacy") return <YouPrivacyPage onBack={goBack} />;
  if (subPage === "chats") return <YouChatDefaultsPage onBack={goBack} />;
  if (subPage === "location") return <YouLocationPage onBack={goBack} />;
  if (subPage === "background") return <YouBackgroundPage onBack={goBack} />;
  if (subPage === "media") return <YouMediaPage onBack={goBack} />;
  if (subPage === "stories") return <YouStoriesPage onBack={goBack} />;

  // ═══ Main cockpit — Orbit-only ═══
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <YouIdentityCard
        avatarUrl={avatarUrl}
        displayName={displayName}
        email={displayEmail}
        username={username}
        shortId={shortId}
        onEditProfile={() => setSubPage("edit-profile")}
      />

      <Separator className="mx-4" />

      <YouSectionBlock title="Communication">
        <YouSmartSettingCard icon={Bell} label="Notifications" summary={summaries.notifSummary} onClick={() => setSubPage("notifications")} />
        <YouSmartSettingCard icon={Phone} label="Calls" summary={summaries.callSummary} onClick={() => setSubPage("calls")} accentColor="hsl(var(--accent))" />
        <YouSmartSettingCard icon={Eye} label="Privacy" summary={summaries.privacySummary} onClick={() => setSubPage("privacy")} />
      </YouSectionBlock>

      <YouSectionBlock title="Chat Experience">
        <YouSmartSettingCard icon={MessageSquare} label="Chat Defaults" summary={summaries.chatDefaultsSummary} onClick={() => setSubPage("chats")} />
        <YouSmartSettingCard icon={Wallpaper} label="Background" summary={summaries.backgroundSummary} onClick={() => setSubPage("background")} accentColor="hsl(var(--accent))" />
        <YouSmartSettingCard icon={ImageIcon} label="Media" summary={summaries.mediaSummary} onClick={() => setSubPage("media")} />
      </YouSectionBlock>

      <YouSectionBlock title="Sharing">
        <YouSmartSettingCard icon={BookOpen} label="Stories" summary={summaries.storiesSummary} onClick={() => setSubPage("stories")} />
        <YouSmartSettingCard icon={MapPin} label="Live Location" summary={summaries.locationSummary} onClick={() => setSubPage("location")} accentColor="hsl(var(--accent))" />
      </YouSectionBlock>

      <Separator className="mx-4" />

      {/* Logout */}
      <div className="px-3 py-3">
        <button onClick={async () => { haptic("medium"); await signOut(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-destructive/10">
            <LogOut className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Log out</p>
        </button>
      </div>

      <div className="text-center pb-6">
        <p className="text-[10px] text-muted-foreground/40">Orbit v1.0</p>
      </div>
    </div>
  );
}
