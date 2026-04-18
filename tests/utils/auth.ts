import type { BrowserContext, Page } from '@playwright/test';
import type { Profile } from '../fixtures/profiles';

/**
 * Best-effort sign-in helpers. Selectors are intentionally generic — if the
 * app's login UI doesn't match, the helper returns `false` and the caller
 * should mark the result as a "weak flow" finding rather than a hard fail.
 */

export async function signInWithEmail(page: Page, profile: Profile): Promise<boolean> {
  if (!profile.creds.email || !profile.creds.password) return false;
  await page.goto('/login');
  const emailInput = page
    .locator('input[type="email"], input[name="email"], input[autocomplete="email"]')
    .first();
  const passwordInput = page
    .locator('input[type="password"], input[name="password"]')
    .first();
  await emailInput.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  if (!(await emailInput.isVisible().catch(() => false))) return false;

  await emailInput.fill(profile.creds.email);
  await passwordInput.fill(profile.creds.password);
  const submit = page
    .getByRole('button', { name: /sign in|log in|login|continue/i })
    .first();
  await submit.click().catch(() => {});

  // Wait for either successful navigation or an error toast.
  await page
    .waitForURL((u) => !/\/login(\b|$)/.test(u.toString()), { timeout: 20_000 })
    .catch(() => {});
  return !/\/login(\b|$)/.test(page.url());
}

export async function applyNetworkProfile(page: Page, profile: Profile): Promise<void> {
  if (!profile.network) return;
  const client = await page.context().newCDPSession(page).catch(() => null);
  if (!client) return;
  await client.send('Network.enable').catch(() => {});
  await client
    .send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.network.latencyMs,
      downloadThroughput: (profile.network.downloadKbps * 1024) / 8,
      uploadThroughput: (profile.network.uploadKbps * 1024) / 8,
    })
    .catch(() => {});
}

/**
 * Tamper with persisted Supabase auth tokens so the next request looks expired.
 * Works for the common `sb-*-auth-token` localStorage key shape.
 */
export async function expireSession(context: BrowserContext): Promise<void> {
  for (const page of context.pages()) {
    await page
      .evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (/auth-token|supabase\.auth\.token/i.test(key)) {
            try {
              const raw = localStorage.getItem(key);
              if (!raw) continue;
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                parsed.expires_at = 1; // epoch — long past
                if (parsed.currentSession) parsed.currentSession.expires_at = 1;
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } catch {
              localStorage.removeItem(key);
            }
          }
        }
      })
      .catch(() => {});
  }
}
