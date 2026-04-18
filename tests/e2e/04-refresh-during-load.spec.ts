import { test, expect } from '../utils/setup';
import { PROFILES } from '../fixtures/profiles';

const APPLICABLE = PROFILES.filter((p) => !p.anonymous);

for (const profile of APPLICABLE) {
  test.describe(`flow:refresh-during-load [${profile.kind}]`, () => {
    test.use({ profile });
    test('refreshing while data still loading does not break the app', async ({
      signedInPage: page,
    }) => {
      await page.goto('/dashboard', { waitUntil: 'commit' });
      // Refresh aggressively before network idle.
      await page.reload({ waitUntil: 'commit' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible();
      const html = await page.content();
      expect(html.length, 'rendered HTML present').toBeGreaterThan(200);
    });
  });
}
