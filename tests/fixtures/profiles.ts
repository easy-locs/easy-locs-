/**
 * Eight canonical user profiles exercised by the bug-surfacing campaign.
 *
 * Account naming convention: `qa+<role>@easy-locs.test`
 * Real credentials must come from env vars (never commit). Missing env vars
 * cause the relevant scenarios to be SKIPPED, not to fail.
 */

export type ProfileKind =
  | 'guest'
  | 'email_confirmed'
  | 'phone_otp'
  | 'super_admin'
  | 'empty_data'
  | 'heavy_data'
  | 'expired_session'
  | 'slow_network';

export interface ProfileCreds {
  email?: string;
  password?: string;
  phone?: string;
  otpBypassToken?: string;
}

export interface Profile {
  kind: ProfileKind;
  label: string;
  creds: ProfileCreds;
  /** Simulate degraded network via Playwright CDP (download/upload bps + latency ms). */
  network?: { downloadKbps: number; uploadKbps: number; latencyMs: number };
  /** Tamper with persisted auth token to simulate expired session. */
  expireSessionAfterLogin?: boolean;
  /** Profile is purely anonymous — no auth attempt at all. */
  anonymous?: boolean;
}

const env = (k: string): string | undefined => process.env[k] || undefined;

export const PROFILES: Profile[] = [
  {
    kind: 'guest',
    label: 'Guest (anonymous)',
    creds: {},
    anonymous: true,
  },
  {
    kind: 'email_confirmed',
    label: 'Email-confirmed user',
    creds: {
      email: env('QA_EMAIL_USER') || 'qa+email@easy-locs.test',
      password: env('QA_EMAIL_PASSWORD'),
    },
  },
  {
    kind: 'phone_otp',
    label: 'Phone-OTP user',
    creds: {
      phone: env('QA_PHONE_NUMBER') || '+10000000000',
      otpBypassToken: env('QA_OTP_BYPASS_TOKEN'),
    },
  },
  {
    kind: 'super_admin',
    label: 'Super admin',
    creds: {
      email: env('QA_ADMIN_EMAIL') || 'qa+admin@easy-locs.test',
      password: env('QA_ADMIN_PASSWORD'),
    },
  },
  {
    kind: 'empty_data',
    label: 'Empty-data user',
    creds: {
      email: env('QA_EMPTY_EMAIL') || 'qa+empty@easy-locs.test',
      password: env('QA_EMPTY_PASSWORD'),
    },
  },
  {
    kind: 'heavy_data',
    label: 'Heavy-data user',
    creds: {
      email: env('QA_HEAVY_EMAIL') || 'qa+heavy@easy-locs.test',
      password: env('QA_HEAVY_PASSWORD'),
    },
  },
  {
    kind: 'expired_session',
    label: 'Expired-session user',
    creds: {
      email: env('QA_EMAIL_USER') || 'qa+email@easy-locs.test',
      password: env('QA_EMAIL_PASSWORD'),
    },
    expireSessionAfterLogin: true,
  },
  {
    kind: 'slow_network',
    label: 'Slow-network user',
    creds: {
      email: env('QA_EMAIL_USER') || 'qa+email@easy-locs.test',
      password: env('QA_EMAIL_PASSWORD'),
    },
    network: { downloadKbps: 400, uploadKbps: 256, latencyMs: 400 },
  },
];

export const PROFILES_BY_KIND: Record<ProfileKind, Profile> = PROFILES.reduce(
  (acc, p) => ({ ...acc, [p.kind]: p }),
  {} as Record<ProfileKind, Profile>,
);

/**
 * A profile is "runnable" when it is anonymous OR has the credentials it needs.
 * Tests should `test.skip(!isRunnable(profile), 'missing creds')` instead of failing.
 */
export function isRunnable(p: Profile): boolean {
  if (p.anonymous) return true;
  if (p.kind === 'phone_otp') return !!p.creds.otpBypassToken;
  return !!(p.creds.email && p.creds.password);
}
