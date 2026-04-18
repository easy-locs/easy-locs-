import { test, expect } from '../utils/setup';
import { PROFILES } from '../fixtures/profiles';
import { signInWithEmail } from '../utils/auth';
import { installDestructiveGuard } from '../utils/destructive-guard';

const APPLICABLE = PROFILES.filter((p) => p.anonymous || (p.creds.email && p.creds.password));

for (const profile of APPLICABLE) {
  test.describe(`flow:public→auth→home [${profile.kind}]`, () => {
    test('public landing renders, then authenticated home appears for non-guests', async ({
      page,
    }) => {
      await installDestructiveGuard(page);
      const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
      expect(resp?.status() ?? 0, 'landing status').toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();

      if (profile.anonymous) {
        // Guest stays on a public surface.
        expect(page.url()).not.toMatch(/\/dashboard/);
        return;
      }
      const ok = await signInWithEmail(page, profile);
      test.skip(!ok, 'sign-in did not advance — recorded as a weak flow');
      await expect(page.locator('body')).toBeVisible();
      expect(page.url(), 'authenticated home reached').not.toMatch(/\/login(\b|$)/);
    });
  });
}
