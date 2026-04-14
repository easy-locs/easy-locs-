import type { CreatorUseCases, CreatorProfile, CreatorAnalytics, TipTransaction, AffiliateLink } from "./ports";

function generateAffiliateCode(userId: string): string {
  return `CRT-${userId.slice(0, 6).toUpperCase()}`;
}

function generateMockEarnings(days: number): { date: string; amount: number }[] {
  const result: { date: string; amount: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toISOString().slice(0, 10),
      amount: Math.round(Math.random() * 50 * 100) / 100,
    });
  }
  return result;
}

function generateFollowerGrowth(days: number): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  const now = new Date();
  let count = 120;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    count += Math.floor(Math.random() * 15);
    result.push({ date: d.toISOString().slice(0, 10), count });
  }
  return result;
}

export function createCreatorService(): CreatorUseCases {
  return {
    async getProfile(userId: string): Promise<CreatorProfile | null> {
      return {
        id: `creator-${userId}`,
        userId,
        displayName: "My Creator Profile",
        bio: "Creating amazing content for the Mondikat community",
        tier: "starter",
        isVerified: false,
        followerCount: 0,
        totalEarnings: 0,
        totalTips: 0,
        totalViews: 0,
        contentCount: 0,
        affiliateCode: generateAffiliateCode(userId),
        categories: ["lifestyle"],
        joinedAt: new Date().toISOString(),
      };
    },

    async getAnalytics(_creatorId: string, period: "7d" | "30d" | "90d"): Promise<CreatorAnalytics> {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      return {
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalTips: 0,
        totalEarnings: 0,
        topContent: [],
        earningsByDay: generateMockEarnings(days),
        followerGrowth: generateFollowerGrowth(days),
      };
    },

    async getTips(_creatorId: string): Promise<TipTransaction[]> {
      return [];
    },

    async sendTip(_fromUserId: string, _toCreatorId: string, _amount: number): Promise<boolean> {
      return true;
    },

    async getAffiliateLinks(_creatorId: string): Promise<AffiliateLink[]> {
      return [];
    },

    async createAffiliateLink(creatorId: string, productId: string): Promise<AffiliateLink> {
      return {
        id: `afl-${Date.now()}`,
        creatorId,
        productId,
        productTitle: "Product",
        url: `https://mondikat.com/r/${generateAffiliateCode(creatorId)}/${productId}`,
        clicks: 0,
        conversions: 0,
        earnings: 0,
        commission: 0.05,
      };
    },
  };
}
