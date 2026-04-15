import { onboardingRepo } from "@/repositories/domain/onboarding.repo";

export async function fetchOnboardingSessions(userId: string) {
  return onboardingRepo.listSessions(userId);
}

export async function upsertOnboardingSession(
  record: Record<string, unknown>
) {
  await onboardingRepo.upsertSession(record);
}
