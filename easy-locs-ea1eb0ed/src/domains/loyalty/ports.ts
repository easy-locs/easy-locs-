export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface LoyaltyAccount {
  id: string;
  userId: string;
  pointsBalance: number;
  lifetimePoints: number;
  totalCashback: number;
  tier: LoyaltyTier;
  referralCode: string;
  referralCount: number;
  streakDays: number;
  lastActiveDate: string;
  createdAt: string;
}

export interface Challenge {
  id: string;
  type: "daily" | "weekly" | "milestone";
  title: string;
  description: string;
  icon: string;
  reward: number;
  target: number;
  current: number;
  completed: boolean;
  expiresAt?: string;
}

export interface TierConfig {
  tier: LoyaltyTier;
  name: string;
  min: number;
  color: string;
  emoji: string;
  multiplier: number;
  benefits: string[];
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  category: "discount" | "delivery" | "cashback" | "experience" | "upgrade";
  icon: string;
}

export interface ReferralInfo {
  code: string;
  totalReferred: number;
  pendingRewards: number;
  earnedFromReferrals: number;
}

export interface LoyaltyUseCases {
  getAccount(userId: string): Promise<LoyaltyAccount | null>;
  getChallenges(userId: string): Promise<Challenge[]>;
  completeChallenge(userId: string, challengeId: string): Promise<boolean>;
  getRewards(): Promise<Reward[]>;
  redeemReward(userId: string, rewardId: string): Promise<boolean>;
  getReferralInfo(userId: string): Promise<ReferralInfo>;
  earnPoints(userId: string, amount: number, source: string, referenceId?: string): Promise<number>;
  getTierConfig(): TierConfig[];
}
