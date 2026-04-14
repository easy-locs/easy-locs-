import { db } from "@/services/db";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "milestone" | "engagement" | "commerce" | "social" | "loyalty";
  condition: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "first_payment", name: "First Purchase", description: "Completed your first payment", emoji: "💳", category: "commerce", condition: "payments >= 1" },
  { id: "power_buyer", name: "Power Buyer", description: "Completed 10 purchases", emoji: "🛒", category: "commerce", condition: "payments >= 10" },
  { id: "big_spender", name: "Big Spender", description: "Spent over 1000 in total", emoji: "💰", category: "commerce", condition: "total_spent >= 1000" },
  { id: "first_review", name: "Voice Heard", description: "Left your first review", emoji: "⭐", category: "engagement", condition: "reviews >= 1" },
  { id: "reviewer_5", name: "Trusted Reviewer", description: "Left 5 reviews", emoji: "🌟", category: "engagement", condition: "reviews >= 5" },
  { id: "reviewer_20", name: "Top Critic", description: "Left 20 reviews", emoji: "🏆", category: "engagement", condition: "reviews >= 20" },
  { id: "first_message", name: "Ice Breaker", description: "Sent your first message", emoji: "💬", category: "social", condition: "messages >= 1" },
  { id: "chat_active", name: "Social Butterfly", description: "Sent 50 messages", emoji: "🦋", category: "social", condition: "messages >= 50" },
  { id: "referral_1", name: "Ambassador", description: "Referred your first friend", emoji: "🤝", category: "social", condition: "referrals >= 1" },
  { id: "referral_5", name: "Community Builder", description: "Referred 5 friends", emoji: "🏗️", category: "social", condition: "referrals >= 5" },
  { id: "loyalty_silver", name: "Silver Member", description: "Reached Silver tier", emoji: "🥈", category: "loyalty", condition: "tier >= silver" },
  { id: "loyalty_gold", name: "Gold Member", description: "Reached Gold tier", emoji: "🥇", category: "loyalty", condition: "tier >= gold" },
  { id: "loyalty_platinum", name: "Platinum Elite", description: "Reached Platinum tier", emoji: "💎", category: "loyalty", condition: "tier >= platinum" },
  { id: "one_year", name: "Veteran", description: "Member for 1 year", emoji: "🎂", category: "milestone", condition: "account_age >= 365" },
  { id: "explorer", name: "Explorer", description: "Used all 5 pillars", emoji: "🧭", category: "milestone", condition: "pillars_used >= 5" },
];

export interface UserBadge {
  badge_id: string;
  unlocked_at: string;
  definition: BadgeDefinition;
}

export interface UserStats {
  payments: number;
  totalSpent: number;
  reviews: number;
  messages: number;
  referrals: number;
  tier: string;
  accountAge: number;
  pillarsUsed: number;
}

export function evaluateBadges(stats: UserStats): string[] {
  const earned: string[] = [];
  const tierRank: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

  for (const badge of BADGE_DEFINITIONS) {
    let qualifies = false;
    switch (badge.id) {
      case "first_payment": qualifies = stats.payments >= 1; break;
      case "power_buyer": qualifies = stats.payments >= 10; break;
      case "big_spender": qualifies = stats.totalSpent >= 1000; break;
      case "first_review": qualifies = stats.reviews >= 1; break;
      case "reviewer_5": qualifies = stats.reviews >= 5; break;
      case "reviewer_20": qualifies = stats.reviews >= 20; break;
      case "first_message": qualifies = stats.messages >= 1; break;
      case "chat_active": qualifies = stats.messages >= 50; break;
      case "referral_1": qualifies = stats.referrals >= 1; break;
      case "referral_5": qualifies = stats.referrals >= 5; break;
      case "loyalty_silver": qualifies = (tierRank[stats.tier] ?? 0) >= 1; break;
      case "loyalty_gold": qualifies = (tierRank[stats.tier] ?? 0) >= 2; break;
      case "loyalty_platinum": qualifies = (tierRank[stats.tier] ?? 0) >= 3; break;
      case "one_year": qualifies = stats.accountAge >= 365; break;
      case "explorer": qualifies = stats.pillarsUsed >= 5; break;
    }
    if (qualifies) earned.push(badge.id);
  }

  return earned;
}

export async function fetchUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await db("user_badges")
    .select("*")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    badge_id: row.badge_id,
    unlocked_at: row.unlocked_at,
    definition: BADGE_DEFINITIONS.find((b) => b.id === row.badge_id) ?? {
      id: row.badge_id,
      name: row.badge_id,
      description: "",
      emoji: "🏅",
      category: "milestone" as const,
      condition: "",
    },
  }));
}

export async function syncUserBadges(userId: string, stats: UserStats): Promise<UserBadge[]> {
  const earned = evaluateBadges(stats);
  const existing = await fetchUserBadges(userId);
  const existingIds = new Set(existing.map((b) => b.badge_id));
  const newBadges: string[] = earned.filter((id) => !existingIds.has(id));

  if (newBadges.length === 0) return existing;

  const now = new Date().toISOString();
  const rows = newBadges.map((badge_id) => ({
    user_id: userId,
    badge_id,
    unlocked_at: now,
  }));

  const { error } = await db("user_badges").insert(rows);
  if (error && error.code !== "42P01") {
    console.warn("[badge-system] Insert failed:", error.message);
  }

  return fetchUserBadges(userId);
}

export async function collectUserStats(userId: string): Promise<UserStats> {
  const safeCount = async (table: string, col: string, val: string) => {
    const r = await db(table).select("id", { count: "exact" }).eq(col, val);
    if (r.error) return null;
    return r.count ?? 0;
  };

  const [payments, reviews, messages, referrals, loyalty, profile] = await Promise.all([
    (async () => {
      const r = await db("wallet_transactions").select("id, amount", { count: "exact" }).eq("user_id", userId);
      if (r.error) return { count: 0, total: 0 };
      return {
        count: r.count ?? 0,
        total: (r.data ?? []).reduce((s: number, row: any) => s + Math.abs(Number(row.amount ?? 0)), 0),
      };
    })(),

    (async () => {
      const primary = await safeCount("reviews", "reviewer_user_id", userId);
      if (primary !== null) return primary;
      const fallback = await safeCount("listing_reviews", "reviewer_orbit_id", userId);
      return fallback ?? 0;
    })(),

    safeCount("chat_messages_v2", "sender_id", userId).then((n) => n ?? 0),

    safeCount("referral_redemptions", "referrer_user_id", userId).then((n) => n ?? 0),

    (async () => {
      const r = await db("loyalty_accounts").select("tier").eq("user_id", userId).maybeSingle();
      return r.data?.tier ?? "bronze";
    })(),

    db.auth.getUser().then((r) => r.data.user?.created_at).catch(() => null),
  ]);

  const accountAge = profile ? Math.floor((Date.now() - new Date(profile).getTime()) / 86_400_000) : 0;

  return {
    payments: payments.count,
    totalSpent: payments.total,
    reviews: reviews as number,
    messages: messages as number,
    referrals: referrals as number,
    tier: loyalty as string,
    accountAge,
    pillarsUsed: 0,
  };
}
