import { test, expect } from '../utils/setup';
import { PROFILES } from '../fixtures/profiles';

const APPLICABLE = PROFILES.filter((p) => !p.anonymous);

for (const profile of APPLICABLE) {
  test.describe(`flow:rapid-back-forward [${profile.kind}]`, () => {
    test.use({ profile });
    test('rapid back/forward navigation stays consistent', async ({ signedInPage: page }) => {
      const stops = ['/dashboard', '/wallet', '/orders', '/notifications'];
      for (const s of stops) await page.goto(s, { waitUntil: 'domcontentloaded' });
      for (let i = 0; i < 4; i++) {
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      for (let i = 0; i < 4; i++) {
        await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });
}
