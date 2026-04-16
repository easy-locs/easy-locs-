import { useFollowers, useFollowingList } from "@/hooks/useSocialGraph";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, UserCheck } from "lucide-react";
import FollowButton from "./FollowButton";
import type { UserSocialProfile } from "@/services/social-graph.service";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface FollowersListProps {
  userId: string;
  currentUserId?: string;
}

export default function FollowersList({ userId, currentUserId }: FollowersListProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"followers" | "following">("followers");
  const { followers, loading: loadingFollowers } = useFollowers(userId);
  const { following, loading: loadingFollowing } = useFollowingList(userId);

  const data = tab === "followers" ? followers : following;
  const loading = tab === "followers" ? loadingFollowers : loadingFollowing;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
        {(["followers", "following"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              tab === tabKey
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {tabKey === "followers" ? t("social.followers") : t("social.following")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-6 text-center">
          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              {tab === "followers" ? t("social.no_followers") : t("social.no_following")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((profile: UserSocialProfile) => (
            <Card key={profile.userId}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {profile.displayName[0]?.toUpperCase()}
                    </span>
                  )}
                  {profile.isMutual && (
                    <div className="absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                      <UserCheck className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {profile.displayName}
                  </p>
                  {profile.isMutual && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {t("social.mutual")}
                      </span>
                    </div>
                  )}
                </div>
                {currentUserId && currentUserId !== profile.userId && (
                  <FollowButton targetUserId={profile.userId} size="sm" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
