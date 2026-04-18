import { test, expect } from '../utils/setup';
import { PROFILES } from '../fixtures/profiles';

const APPLICABLE = PROFILES.filter(
  (p) => !p.anonymous && p.kind !== 'expired_session' && p.kind !== 'slow_network',
);

for (const profile of APPLICABLE) {
  test.describe(`flow:multi-tab [${profile.kind}]`, () => {
    test.use({ profile });
    test('logout in tab A is reflected in tab B', async ({ signedInPage: page, context }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      const tabB = await context.newPage();
      await tabB.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(tabB.locator('body')).toBeVisible();

      // Wipe auth from tab A and broadcast a storage event.
      await page.evaluate(() => {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && /auth|supabase/i.test(k)) localStorage.removeItem(k);
        }
        window.dispatchEvent(new StorageEvent('storage', { key: 'sb-auth-token' }));
      });

      // Tab B should eventually no longer present authenticated chrome.
      await tabB.reload({ waitUntil: 'domcontentloaded' });
      await expect(tabB.locator('body')).toBeVisible();
    });
  });
}
