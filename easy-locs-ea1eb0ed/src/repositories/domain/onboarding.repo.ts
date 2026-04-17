
import { cFrom, cRpc } from "@/lib/execution/content-mutation";
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
    const { data } = await cFrom("onboarding_sessions", { schema: "onboarding" })
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  async upsertSession(record: Record<string, unknown>) {
    const { error } = await cFrom("onboarding_sessions", { schema: "onboarding" })
      .upsert(record);
    if (error) throw error;
  },

  async listImportJobs(userId: string) {
    const { data } = await cFrom("import_jobs", { schema: "onboarding" })
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  async listStagingEntities(jobId: string) {
    const { data } = await cFrom("staging_entities", { schema: "onboarding" })
      .select("*")
      .eq("job_id", jobId);
    return data ?? [];
  },
};
