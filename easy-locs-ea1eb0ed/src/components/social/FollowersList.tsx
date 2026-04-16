import { useFollowers, useFollowingList } from "@/hooks/useSocialGraph";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import FollowButton from "./FollowButton";
import type { UserSocialProfile } from "@/services/social-graph.service";
import { useState } from "react";

interface FollowersListProps {
  userId: string;
  currentUserId?: string;
}

export default function FollowersList({ userId, currentUserId }: FollowersListProps) {
  const [tab, setTab] = useState<"followers" | "following">("followers");
  const { followers, loading: loadingFollowers } = useFollowers(userId);
  const { following, loading: loadingFollowing } = useFollowingList(userId);

  const data = tab === "followers" ? followers : following;
  const loading = tab === "followers" ? loadingFollowers : loadingFollowing;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
        {(["followers", "following"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              tab === t
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {t === "followers" ? "Followers" : "Following"}
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
              {tab === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((profile: UserSocialProfile) => (
            <Card key={profile.userId}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
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
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {profile.displayName}
                  </p>
                  {profile.isMutual && (
                    <p className="text-[10px] text-primary">Mutual friend</p>
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
