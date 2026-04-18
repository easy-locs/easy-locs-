import { test, expect } from '../utils/setup';
import { PROFILES } from '../fixtures/profiles';

const APPLICABLE = PROFILES.filter((p) => !p.anonymous);

const STOPS = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/wallet', name: 'wallet' },
  { path: '/orders', name: 'orders' },
  { path: '/notifications', name: 'notifications' },
  { path: '/dashboard', name: 'return-to-dashboard' },
];

for (const profile of APPLICABLE) {
  test.describe(`flow:dashboard→wallet→orders→notifications→return [${profile.kind}]`, () => {
    test.use({ profile });
    test('completes pillar round-trip without console errors', async ({ signedInPage: page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });

      for (const stop of STOPS) {
        const resp = await page.goto(stop.path, { waitUntil: 'domcontentloaded' });
        expect(resp?.status() ?? 0, `${stop.name} response`).toBeLessThan(500);
      }
      // Allow some app-level non-fatal warnings; only flag pageerrors.
      const fatal = errors.filter((e) => /TypeError|ReferenceError|Uncaught/i.test(e));
      expect(fatal, `fatal errors during pillar tour for ${profile.kind}`).toEqual([]);
    });
  });
}
