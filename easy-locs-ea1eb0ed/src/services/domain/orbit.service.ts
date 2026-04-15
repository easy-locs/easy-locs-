import { orbitRepo } from "@/repositories/domain/orbit.repo";

export async function fetchAdhanNotificationPrefs(userId: string) {
  return orbitRepo.fetchAdhanPrefsEnabled(userId);
}

export async function fetchAdhanNotificationFullPrefs(userId: string) {
  return orbitRepo.fetchAdhanPrefsFull(userId);
}

export async function upsertAdhanNotificationPrefs(
  userId: string,
  enabled: boolean
) {
  await orbitRepo.upsertAdhanPrefs(userId, enabled);
}
