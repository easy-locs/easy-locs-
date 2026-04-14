import type { LoyaltyUseCases, LoyaltyAccount, Challenge, Reward, ReferralInfo, TierConfig, LoyaltyTier } from "./ports";

export const TIER_CONFIG: TierConfig[] = [
  {
    tier: "bronze", name: "Bronze", min: 0, color: "hsl(25 60% 50%)",
    emoji: "\u{1F949}", multiplier: 1,
    benefits: ["Earn 1pt per 1 AED spent", "Access to basic rewards"],
  },
  {
    tier: "silver", name: "Silver", min: 500, color: "hsl(220 15% 60%)",
    emoji: "\u{1F948}", multiplier: 1.25,
    benefits: ["1.25x points multiplier", "Free delivery 1x/week", "Priority support"],
  },
  {
    tier: "gold", name: "Gold", min: 2000, color: "hsl(38 92% 50%)",
    emoji: "\u{1F947}", multiplier: 1.5,
    benefits: ["1.5x points multiplier", "Free delivery 3x/week", "Early access to features", "Preferential wallet rates"],
  },
  {
    tier: "platinum", name: "Platinum", min: 5000, color: "hsl(270 60% 55%)",
    emoji: "\u{1F48E}", multiplier: 2,
    benefits: ["2x points multiplier", "Unlimited free delivery", "5% cashback on everything", "VIP support", "Trust Engine badge"],
  },
  {
    tier: "diamond", name: "Diamond", min: 15000, color: "hsl(200 80% 60%)",
    emoji: "\u{2B50}", multiplier: 3,
    benefits: ["3x points multiplier", "10% cashback", "Exclusive events access", "Concierge service", "Premium partner benefits"],
  },
];

const REWARDS_CATALOG: Reward[] = [
  { id: "free_delivery", title: "Free Delivery", description: "On your next order", cost: 200, category: "delivery", icon: "truck" },
  { id: "discount_3", title: "3% Discount", description: "Applied at checkout", cost: 150, category: "discount", icon: "percent" },
  { id: "discount_5", title: "5% Discount", description: "Applied at checkout", cost: 300, category: "discount", icon: "percent" },
  { id: "cashback_5", title: "5 AED Cashback", description: "Credited to wallet", cost: 400, category: "cashback", icon: "wallet" },
  { id: "cashback_20", title: "20 AED Cashback", description: "Credited to wallet", cost: 1500, category: "cashback", icon: "wallet" },
  { id: "priority_support", title: "Priority Support", description: "24h response guaranteed", cost: 100, category: "upgrade", icon: "headphones" },
  { id: "vip_lounge", title: "VIP Experience", description: "Exclusive partner event access", cost: 5000, category: "experience", icon: "sparkles" },
  { id: "double_points_24h", title: "Double Points (24h)", description: "2x earning rate for 24 hours", cost: 800, category: "upgrade", icon: "zap" },
];

function computeTier(lifetimePoints: number): LoyaltyTier {
  for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
    if (lifetimePoints >= TIER_CONFIG[i].min) return TIER_CONFIG[i].tier;
  }
  return "bronze";
}

function generateReferralCode(userId: string): string {
  const hash = userId.slice(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MONDI-${hash}${suffix}`;
}

function generateDailyChallenges(): Challenge[] {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return [
    {
      id: `daily-order-${now.toISOString().slice(0, 10)}`,
      type: "daily", title: "First Order Today",
      description: "Place any order to earn bonus points",
      icon: "shopping-bag", reward: 25, target: 1, current: 0,
      completed: false, expiresAt: endOfDay.toISOString(),
    },
    {
      id: `daily-explore-${now.toISOString().slice(0, 10)}`,
      type: "daily", title: "Explorer",
      description: "Browse 5 different categories",
      icon: "compass", reward: 15, target: 5, current: 0,
      completed: false, expiresAt: endOfDay.toISOString(),
    },
    {
      id: `daily-share-${now.toISOString().slice(0, 10)}`,
      type: "daily", title: "Social Butterfly",
      description: "Share a listing or story with a friend",
      icon: "share-2", reward: 10, target: 1, current: 0,
      completed: false, expiresAt: endOfDay.toISOString(),
    },
  ];
}

function generateWeeklyChallenges(): Challenge[] {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  return [
    {
      id: `weekly-orders-${now.toISOString().slice(0, 10)}`,
      type: "weekly", title: "Regular Customer",
      description: "Complete 5 orders this week",
      icon: "repeat", reward: 100, target: 5, current: 0,
      completed: false, expiresAt: endOfWeek.toISOString(),
    },
    {
      id: `weekly-travel-${now.toISOString().slice(0, 10)}`,
      type: "weekly", title: "Traveler",
      description: "Book a travel service (flight, hotel, or ride)",
      icon: "plane", reward: 75, target: 1, current: 0,
      completed: false, expiresAt: endOfWeek.toISOString(),
    },
    {
      id: `weekly-refer-${now.toISOString().slice(0, 10)}`,
      type: "weekly", title: "Ambassador",
      description: "Refer 2 friends who sign up",
      icon: "users", reward: 200, target: 2, current: 0,
      completed: false, expiresAt: endOfWeek.toISOString(),
    },
    {
      id: `weekly-wallet-${now.toISOString().slice(0, 10)}`,
      type: "weekly", title: "Wallet Pro",
      description: "Make 3 wallet transactions",
      icon: "credit-card", reward: 50, target: 3, current: 0,
      completed: false, expiresAt: endOfWeek.toISOString(),
    },
  ];
}

function generateMilestones(lifetimePoints: number): Challenge[] {
  const milestones = [
    { target: 100, title: "Getting Started", reward: 50 },
    { target: 500, title: "Silver Path", reward: 100 },
    { target: 2000, title: "Gold Rush", reward: 250 },
    { target: 5000, title: "Platinum Goal", reward: 500 },
    { target: 15000, title: "Diamond Dream", reward: 1000 },
  ];

  return milestones.map((m) => ({
    id: `milestone-${m.target}`,
    type: "milestone" as const,
    title: m.title,
    description: `Earn ${m.target} lifetime points`,
    icon: "target",
    reward: m.reward,
    target: m.target,
    current: Math.min(lifetimePoints, m.target),
    completed: lifetimePoints >= m.target,
  }));
}

export function createLoyaltyService(): LoyaltyUseCases {
  return {
    async getAccount(userId: string): Promise<LoyaltyAccount | null> {
      return {
        id: `loyalty-${userId}`,
        userId,
        pointsBalance: 0,
        lifetimePoints: 0,
        totalCashback: 0,
        tier: "bronze",
        referralCode: generateReferralCode(userId),
        referralCount: 0,
        streakDays: 0,
        lastActiveDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    },

    async getChallenges(userId: string): Promise<Challenge[]> {
      const account = await this.getAccount(userId);
      const lifetime = account?.lifetimePoints ?? 0;
      return [
        ...generateDailyChallenges(),
        ...generateWeeklyChallenges(),
        ...generateMilestones(lifetime),
      ];
    },

    async completeChallenge(_userId: string, _challengeId: string): Promise<boolean> {
      return true;
    },

    async getRewards(): Promise<Reward[]> {
      return REWARDS_CATALOG;
    },

    async redeemReward(_userId: string, _rewardId: string): Promise<boolean> {
      return true;
    },

    async getReferralInfo(userId: string): Promise<ReferralInfo> {
      return {
        code: generateReferralCode(userId),
        totalReferred: 0,
        pendingRewards: 0,
        earnedFromReferrals: 0,
      };
    },

    async earnPoints(_userId: string, amount: number, _source: string): Promise<number> {
      return Math.floor(amount);
    },

    getTierConfig(): TierConfig[] {
      return TIER_CONFIG;
    },
  };
}
