import { cosineSimilarity, averageVectors, normalizeVector } from "./vector-similarity";

export interface UserInteraction {
  userId: string;
  itemId: string;
  type: "view" | "click" | "purchase" | "favorite" | "review";
  weight: number;
  timestamp: number;
}

export interface UserProfile {
  userId: string;
  interactionVector: number[];
  interactionCount: number;
  lastActive: number;
}

const INTERACTION_WEIGHTS: Record<UserInteraction["type"], number> = {
  view: 0.1,
  click: 0.3,
  purchase: 1.0,
  favorite: 0.7,
  review: 0.8,
};

const userProfiles = new Map<string, UserProfile>();
const interactionLog: UserInteraction[] = [];
const MAX_LOG_SIZE = 10000;

export function recordInteraction(interaction: Omit<UserInteraction, "weight">): void {
  const weight = INTERACTION_WEIGHTS[interaction.type] ?? 0.1;
  const entry: UserInteraction = { ...interaction, weight };
  interactionLog.push(entry);
  if (interactionLog.length > MAX_LOG_SIZE) {
    interactionLog.splice(0, interactionLog.length - MAX_LOG_SIZE);
  }
}

export function buildUserProfile(userId: string, itemEmbeddings: Map<string, number[]>): UserProfile {
  const interactions = interactionLog.filter((i) => i.userId === userId);
  const now = Date.now();
  const decayMs = 7 * 24 * 60 * 60 * 1000;

  const weightedVectors: number[][] = [];
  for (const interaction of interactions) {
    const embedding = itemEmbeddings.get(interaction.itemId);
    if (!embedding) continue;
    const age = now - interaction.timestamp;
    const decay = Math.exp(-age / decayMs);
    const weight = interaction.weight * decay;
    weightedVectors.push(embedding.map((v) => v * weight));
  }

  const rawVector = weightedVectors.length > 0 ? normalizeVector(averageVectors(weightedVectors)) : [];
  const sanitizedVector = rawVector.map((v) => (Number.isFinite(v) ? v : 0));

  const profile: UserProfile = {
    userId,
    interactionVector: sanitizedVector,
    interactionCount: interactions.length,
    lastActive: interactions.length > 0 ? Math.max(...interactions.map((i) => i.timestamp)) : 0,
  };

  userProfiles.set(userId, profile);
  return profile;
}

export function findSimilarUsers(userId: string, topK = 10): { userId: string; similarity: number }[] {
  const profile = userProfiles.get(userId);
  if (!profile || profile.interactionVector.length === 0) return [];

  const results: { userId: string; similarity: number }[] = [];
  for (const [otherId, otherProfile] of userProfiles) {
    if (otherId === userId || otherProfile.interactionVector.length === 0) continue;
    const sim = cosineSimilarity(profile.interactionVector, otherProfile.interactionVector);
    if (sim > 0.1) {
      results.push({ userId: otherId, similarity: sim });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

export function getCollaborativeSignals(
  userId: string,
  itemEmbeddings: Map<string, number[]>,
): Map<string, number> {
  const similarUsers = findSimilarUsers(userId, 20);
  const itemScores = new Map<string, number>();

  const userItems = new Set(
    interactionLog.filter((i) => i.userId === userId).map((i) => i.itemId),
  );

  for (const { userId: simUserId, similarity } of similarUsers) {
    const simInteractions = interactionLog.filter((i) => i.userId === simUserId);
    for (const interaction of simInteractions) {
      if (userItems.has(interaction.itemId)) continue;
      const current = itemScores.get(interaction.itemId) || 0;
      itemScores.set(interaction.itemId, current + similarity * interaction.weight);
    }
  }

  for (const [itemId, score] of itemScores) {
    if (!Number.isFinite(score)) {
      itemScores.set(itemId, 0);
    }
  }

  return itemScores;
}

export function getUserProfile(userId: string): UserProfile | undefined {
  return userProfiles.get(userId);
}
