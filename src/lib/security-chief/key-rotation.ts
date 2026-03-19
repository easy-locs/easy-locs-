import { KEY_ROTATION_POLICIES } from "./config";
import { getCurrentDomainKeyMeta, rotateDomainKey } from "./domain-keys";

export async function ensureRotationForDomain(domain: (typeof KEY_ROTATION_POLICIES)[number]["domain"]) {
  const policy = KEY_ROTATION_POLICIES.find((p) => p.domain === domain);
  if (!policy) throw new Error(`Missing rotation policy for ${domain}`);

  const meta = await getCurrentDomainKeyMeta(domain);
  if (!meta) {
    await rotateDomainKey(domain, policy.rotateEveryHours);
    return true;
  }

  const exp = new Date(meta.expiresAt).getTime();
  if (Date.now() >= exp) {
    await rotateDomainKey(domain, policy.rotateEveryHours);
    return true;
  }

  return false;
}

export async function ensureAllKeyRotations() {
  for (const policy of KEY_ROTATION_POLICIES) {
    await ensureRotationForDomain(policy.domain);
  }
}
