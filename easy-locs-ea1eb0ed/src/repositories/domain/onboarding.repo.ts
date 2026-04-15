import { domainDb } from "@/services/db";

export {
  fetchOnboardingProgress,
  saveOnboardingStep,
  updateProfileCountryAndType,
  completeOnboarding,
  fetchUserOrg,
  createOrgForUser,
  insertOwnerProfile,
} from "@/repositories/onboarding.repository";

export const onboardingRepo = {
  async listSessions(userId: string) {
    const { data } = await domainDb.onboarding
      .from("onboarding_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  async upsertSession(record: Record<string, unknown>) {
    const { error } = await domainDb.onboarding
      .from("onboarding_sessions")
      .upsert(record);
    if (error) throw error;
  },

  async listImportJobs(userId: string) {
    const { data } = await domainDb.onboarding
      .from("import_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  async listStagingEntities(jobId: string) {
    const { data } = await domainDb.onboarding
      .from("staging_entities")
      .select("*")
      .eq("job_id", jobId);
    return data ?? [];
  },
};
