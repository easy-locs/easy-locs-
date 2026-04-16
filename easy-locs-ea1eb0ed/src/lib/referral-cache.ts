export const REFERRAL_CODE_KEY = "easylocs_referral_code";
export const REFERRAL_TRACKED_KEY = "easylocs_ref_tracked";
export const PENDING_REF_KEY = "easylocs_pending_ref_code";

export const referralMemoryCache = new Map<string, string>();

export function clearReferralCaches() {
  try { localStorage.removeItem(REFERRAL_CODE_KEY); } catch {}
  try { sessionStorage.removeItem(REFERRAL_TRACKED_KEY); } catch {}
  try { sessionStorage.removeItem(PENDING_REF_KEY); } catch {}
  referralMemoryCache.clear();
}
