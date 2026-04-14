export type CreatorTier = "starter" | "rising" | "established" | "verified" | "partner";
export type ContentType = "story" | "post" | "live" | "collection" | "guide";

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  coverUrl?: string;
  tier: CreatorTier;
  isVerified: boolean;
  followerCount: number;
  totalEarnings: number;
  totalTips: number;
  totalViews: number;
  contentCount: number;
  affiliateCode: string;
  categories: string[];
  joinedAt: string;
}

export interface TipTransaction {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toCreatorId: string;
  amount: number;
  currency: string;
  message?: string;
  contentId?: string;
  createdAt: string;
}

export interface CreatorAnalytics {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalTips: number;
  totalEarnings: number;
  topContent: { id: string; title: string; views: number; earnings: number }[];
  earningsByDay: { date: string; amount: number }[];
  followerGrowth: { date: string; count: number }[];
}

export interface AffiliateLink {
  id: string;
  creatorId: string;
  productId: string;
  productTitle: string;
  url: string;
  clicks: number;
  conversions: number;
  earnings: number;
  commission: number;
}

export interface CreatorUseCases {
  getProfile(userId: string): Promise<CreatorProfile | null>;
  getAnalytics(creatorId: string, period: "7d" | "30d" | "90d"): Promise<CreatorAnalytics>;
  getTips(creatorId: string): Promise<TipTransaction[]>;
  sendTip(fromUserId: string, toCreatorId: string, amount: number, message?: string, contentId?: string): Promise<boolean>;
  getAffiliateLinks(creatorId: string): Promise<AffiliateLink[]>;
  createAffiliateLink(creatorId: string, productId: string): Promise<AffiliateLink>;
}
