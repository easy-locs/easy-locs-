/**
 * OrbitAccountSection — "YOU" cockpit inside Orbit hub.
 * Uses canonical identity resolution for consistent profile display.
 */
import { useState } from "react";
import {
  Bell, Eye, Phone, MessageSquare, Wallpaper, ImageIcon,
  BookOpen, MapPin, LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { useUsername } from "@/hooks/useUsername";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import YouIdentityCard from "@/components/orbit/you/YouIdentityCard";
import YouSmartSettingCard from "@/components/orbit/you/YouSmartSettingCard";
import YouSectionBlock from "@/components/orbit/you/YouSectionBlock";
import { useYouSummaries } from "@/hooks/orbit/useYouSummaries";

// Sub-pages
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
  const orbitIdentity = useOrbitIdentity();

  // Canonical identity chain: orbit profile → auth metadata → fallback
  const displayName = orbitIdentity?.displayName
    || user?.user_metadata?.full_name
    || user?.user_metadata?.display_name
    || "";
  const avatarUrl = orbitIdentity?.avatarUrl
    || user?.user_metadata?.avatar_url
    || "";
  const displayEmail = orbitIdentity?.email || user?.email || "—";
  const shortId = (user?.id || "").substring(0, 8).toUpperCase();

  const goBack = () => setSubPage("main");

  if (subPage === "edit-profile") return <YouEditProfilePage onBack={goBack} />;
  if (subPage === "notifications") return <YouNotificationsPage onBack={goBack} />;
  if (subPage === "calls") return <YouCallsPage onBack={goBack} />;
  if (subPage === "privacy") return <YouPrivacyPage onBack={goBack} />;
  if (subPage === "chats") return <YouChatDefaultsPage onBack={goBack} />;
  if (subPage === "location") return <YouLocationPage onBack={goBack} />;
  if (subPage === "background") return <YouBackgroundPage onBack={goBack} />;
  if (subPage === "media") return <YouMediaPage onBack={goBack} />;
  if (subPage === "stories") return <YouStoriesPage onBack={goBack} />;

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

      <div className="px-3 pb-2">
        <button
          onClick={async () => { haptic("medium"); await signOut(); navigate("/login"); }}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors text-left hover:bg-destructive/5 active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--destructive) / 0.1)" }}>
            <LogOut className="h-[18px] w-[18px]" style={{ color: "hsl(var(--destructive))" }} />
          </div>
          <p className="text-[14px] font-medium" style={{ color: "hsl(var(--destructive))" }}>Log out</p>
        </button>
      </div>

      <div className="text-center pb-8 pt-2">
        <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }}>Orbit v1.0</p>
      </div>
    </div>
  );
}
