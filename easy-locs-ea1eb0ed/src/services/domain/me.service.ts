import { meRepo } from "@/repositories/domain/me.repo";

export async function fetchUserProfile(userId: string) {
  return meRepo.getProfileTrustFields(userId);
}

export async function fetchUserTrustGraph(userId: string) {
  const profile = await meRepo.getProfileTrustFields(userId);
  if (!profile) return null;
  return meRepo.fetchTrustGraph(userId);
}

export async function fetchMediaAsset(bucket: string, path: string) {
  return meRepo.fetchMediaAsset(bucket, path);
}
