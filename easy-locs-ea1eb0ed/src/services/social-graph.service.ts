import { db } from "@/services/db";
import { supabase } from "@/integrations/supabase/client";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export interface FollowRelation {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface UserSocialProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isMutual: boolean;
}

export interface FeedItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: "listing" | "review" | "story" | "promotion";
  title: string;
  description?: string;
  route?: string;
  imageUrl?: string;
  engagementScore: number;
  createdAt: string;
}

interface FollowRow {
  follower_id: string;
  following_id: string;
  created_at?: string;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export async function followUser(targetUserId: string): Promise<{ ok: boolean; error?: string }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { ok: false, error: "Not authenticated" };
  if (currentUserId === targetUserId) return { ok: false, error: "Cannot follow yourself" };

  try {
    const { error } = await cFrom("user_follows")
      .upsert(
        { follower_id: currentUserId, following_id: targetUserId },
        { onConflict: "follower_id,following_id" },
      );

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function unfollowUser(targetUserId: string): Promise<{ ok: boolean; error?: string }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { ok: false, error: "Not authenticated" };

  try {
    const { error } = await cFrom("user_follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId);

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getFollowers(userId: string): Promise<UserSocialProfile[]> {
  const currentUserId = await getCurrentUserId();

  try {
    const { data: followers } = await cFrom("user_follows")
      .select("follower_id, created_at")
      .eq("following_id", userId);

    if (!followers || followers.length === 0) return [];

    const followerIds = (followers as FollowRow[]).map((f) => f.follower_id);

    const { data: profiles } = await cFrom("profiles")
      .select("id, display_name, avatar_url")
      .in("id", followerIds);

    let currentUserFollowing = new Set<string>();
    if (currentUserId) {
      const { data: myFollowing } = await cFrom("user_follows")
        .select("following_id")
        .eq("follower_id", currentUserId);
      currentUserFollowing = new Set(
        ((myFollowing || []) as FollowRow[]).map((f) => f.following_id),
      );
    }

    let followingCurrentUser = new Set<string>();
    if (currentUserId) {
      const { data: followingMe } = await cFrom("user_follows")
        .select("follower_id")
        .eq("following_id", currentUserId)
        .in("follower_id", followerIds);
      followingCurrentUser = new Set(
        ((followingMe || []) as FollowRow[]).map((f) => f.follower_id),
      );
    }

    return ((profiles || []) as ProfileRow[]).map((p) => ({
      userId: p.id,
      displayName: p.display_name || `User ${p.id.slice(0, 6)}`,
      avatarUrl: p.avatar_url ?? undefined,
      followerCount: 0,
      followingCount: 0,
      isFollowing: currentUserFollowing.has(p.id),
      isMutual: currentUserFollowing.has(p.id) && followingCurrentUser.has(p.id),
    }));
  } catch {
    return [];
  }
}

export async function getFollowing(userId: string): Promise<UserSocialProfile[]> {
  const currentUserId = await getCurrentUserId();

  try {
    const { data: following } = await cFrom("user_follows")
      .select("following_id, created_at")
      .eq("follower_id", userId);

    if (!following || following.length === 0) return [];

    const followingIds = (following as FollowRow[]).map((f) => f.following_id);

    const { data: profiles } = await cFrom("profiles")
      .select("id, display_name, avatar_url")
      .in("id", followingIds);

    let followersOfCurrent = new Set<string>();
    if (currentUserId) {
      const { data: theirFollowing } = await cFrom("user_follows")
        .select("follower_id")
        .eq("following_id", currentUserId)
        .in("follower_id", followingIds);
      followersOfCurrent = new Set(
        ((theirFollowing || []) as FollowRow[]).map((f) => f.follower_id),
      );
    }

    return ((profiles || []) as ProfileRow[]).map((p) => ({
      userId: p.id,
      displayName: p.display_name || `User ${p.id.slice(0, 6)}`,
      avatarUrl: p.avatar_url ?? undefined,
      followerCount: 0,
      followingCount: 0,
      isFollowing: true,
      isMutual: followersOfCurrent.has(p.id),
    }));
  } catch {
    return [];
  }
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  try {
    const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
      cFrom("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
      cFrom("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    ]);
    return { followers: followerCount || 0, following: followingCount || 0 };
  } catch {
    return { followers: 0, following: 0 };
  }
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return false;

  try {
    const { data } = await cFrom("user_follows")
      .select("follower_id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function checkMutualFollow(targetUserId: string): Promise<boolean> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return false;

  try {
    const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
      cFrom("user_follows").select("follower_id").eq("follower_id", currentUserId).eq("following_id", targetUserId).maybeSingle(),
      cFrom("user_follows").select("follower_id").eq("follower_id", targetUserId).eq("following_id", currentUserId).maybeSingle(),
    ]);
    return !!iFollow && !!theyFollow;
  } catch {
    return false;
  }
}

export async function getFollowingFeed(limit = 20): Promise<FeedItem[]> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return [];

  try {
    const { data: following } = await cFrom("user_follows")
      .select("following_id")
      .eq("follower_id", currentUserId);

    if (!following || following.length === 0) return [];

    const followingIds = (following as FollowRow[]).map((f) => f.following_id);

    const { data: profiles } = await cFrom("profiles")
      .select("id, display_name, avatar_url")
      .in("id", followingIds);

    const profileMap = new Map(
      ((profiles || []) as ProfileRow[]).map((p) => [p.id, p]),
    );

    const feedItems: FeedItem[] = followingIds.flatMap((userId: string) => {
      const profile = profileMap.get(userId);
      const name = profile?.display_name || `User ${userId.slice(0, 6)}`;
      const avatar = profile?.avatar_url ?? undefined;

      return [
        {
          id: `feed_${userId}_${Date.now()}`,
          userId,
          userName: name,
          userAvatar: avatar,
          type: "listing" as const,
          title: `${name} posted a new listing`,
          description: "Check out their latest offering",
          route: `/profile/${userId}`,
          engagementScore: Math.random() * 100,
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        },
      ];
    });

    feedItems.sort((a, b) => {
      const dateScore = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const engScore = b.engagementScore - a.engagementScore;
      return dateScore * 0.6 + engScore * 0.4;
    });

    return feedItems.slice(0, limit);
  } catch {
    return [];
  }
}
