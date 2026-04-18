import { test, expect } from '../utils/setup';
import { PROFILES_BY_KIND } from '../fixtures/profiles';

test.describe('flow:session-expiry-mid-navigation [expired_session]', () => {
  test.use({ profile: PROFILES_BY_KIND.expired_session });
  test('app gracefully redirects when token is expired mid-navigation', async ({
    signedInPage: page,
  }) => {
    await page.goto('/wallet', { waitUntil: 'domcontentloaded' });
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    // Either we land back at login OR the app shows an explicit "session expired"
    // surface. Either is acceptable; a hung blank page is not.
    await expect(page.locator('body')).toBeVisible();
    const text = (await page.content()).toLowerCase();
    const sane =
      /\/login(\b|$)/.test(page.url()) ||
      /sign in|log in|session.*(expired|invalid)|please.*authenticate/.test(text);
    expect(sane, 'expired session handled gracefully').toBeTruthy();
  });
});
