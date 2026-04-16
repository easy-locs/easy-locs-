import { useState, useCallback, useEffect } from "react";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowCounts,
  isFollowing as checkIsFollowing,
  checkMutualFollow,
  getFollowingFeed,
  type UserSocialProfile,
  type FeedItem,
} from "@/services/social-graph.service";

export function useFollow(targetUserId: string) {
  const [following, setFollowing] = useState(false);
  const [mutual, setMutual] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    checkIsFollowing(targetUserId).then(setFollowing);
    checkMutualFollow(targetUserId).then(setMutual);
  }, [targetUserId]);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      if (following) {
        const result = await unfollowUser(targetUserId);
        if (result.ok) {
          setFollowing(false);
          setMutual(false);
        }
      } else {
        const result = await followUser(targetUserId);
        if (result.ok) {
          setFollowing(true);
          const isMutual = await checkMutualFollow(targetUserId);
          setMutual(isMutual);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId, following]);

  return { following, mutual, loading, toggle };
}

export function useFollowCounts(userId: string) {
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getFollowCounts(userId);
      setCounts(result);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...counts, loading, refresh };
}

export function useFollowers(userId: string) {
  const [followers, setFollowers] = useState<UserSocialProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getFollowers(userId)
      .then(setFollowers)
      .finally(() => setLoading(false));
  }, [userId]);

  return { followers, loading };
}

export function useFollowingList(userId: string) {
  const [following, setFollowing] = useState<UserSocialProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getFollowing(userId)
      .then(setFollowing)
      .finally(() => setLoading(false));
  }, [userId]);

  return { following, loading };
}

export function useFollowingFeed(limit = 20) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getFollowingFeed(limit);
      setFeed(items);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { feed, loading, refresh };
}
