import { test, expect } from '../utils/setup';
import { PROFILES } from '../fixtures/profiles';

const APPLICABLE = PROFILES.filter(
  (p) => !p.anonymous && p.kind !== 'expired_session',
);

for (const profile of APPLICABLE) {
  test.describe(`flow:login→dashboard [${profile.kind}]`, () => {
    test.use({ profile });
    test('lands on an authenticated home surface', async ({ signedInPage: page }) => {
      const url = page.url();
      expect(url, `still on /login for ${profile.kind}`).not.toMatch(/\/login(\b|$)/);
      // Some authenticated marker should be visible — bottom nav, avatar, etc.
      const marker = page
        .locator('[data-testid="bottom-nav"], nav[role="navigation"], header')
        .first();
      await expect(marker).toBeVisible({ timeout: 15_000 });
    });
  });
}
