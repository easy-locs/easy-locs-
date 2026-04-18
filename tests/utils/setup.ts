import { test as base, expect } from '@playwright/test';
import type { Profile } from '../fixtures/profiles';
import { isRunnable } from '../fixtures/profiles';
import { applyNetworkProfile, expireSession, signInWithEmail } from './auth';
import { installDestructiveGuard } from './destructive-guard';

type Fixtures = {
  profile: Profile;
  signedInPage: import('@playwright/test').Page;
};

export const test = base.extend<Fixtures>({
  profile: [{ kind: 'guest', label: 'guest', creds: {}, anonymous: true }, { option: true }],
  signedInPage: async ({ page, context, profile }, use) => {
    test.skip(!isRunnable(profile), `profile ${profile.kind} missing creds — skipping`);
    await installDestructiveGuard(page);
    await applyNetworkProfile(page, profile);
    if (!profile.anonymous) {
      await signInWithEmail(page, profile);
      if (profile.expireSessionAfterLogin) {
        await expireSession(context);
      }
    }
    await use(page);
  },
});

export { expect };
