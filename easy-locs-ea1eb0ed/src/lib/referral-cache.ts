export const REFERRAL_CODE_KEY = "easylocs_referral_code";
export const REFERRAL_TRACKED_KEY = "easylocs_ref_tracked";

export function clearReferralCaches() {
  try { localStorage.removeItem(REFERRAL_CODE_KEY); } catch {}
  try { sessionStorage.removeItem(REFERRAL_TRACKED_KEY); } catch {}
}
