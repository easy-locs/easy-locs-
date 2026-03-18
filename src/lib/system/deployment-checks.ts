export function getDeploymentChecklist() {
  return [
    "Auth providers configured",
    "RLS tested on every critical table",
    "Stripe secret key configured in edge env",
    "SMS provider secrets configured",
    "Push provider credentials configured",
    "Storage buckets with correct policies",
    "Realtime enabled for orders / dispatch / tracking",
    "OTP codes hashed in production",
    "Guest cart token signing upgraded to HMAC/JWT",
    "Public storefront slug uniqueness enforced",
    "Background tracking in native mobile wrapper",
    "Error logging / monitoring connected",
    "Rate limiting for OTP / payment / checkout",
    "DB backups and point-in-time recovery enabled",
    "Domain / SSL / CDN configured",
  ];
}
