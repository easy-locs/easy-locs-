import type { Page, Route } from '@playwright/test';

/**
 * Hard-block destructive business actions. The campaign is read-mostly:
 * no real payments, no destructive mutations, no broadcasts to real users.
 *
 * Strategy: install a route handler that aborts requests whose URL or method
 * matches a denylist, and a click guard that throws if a button matching a
 * denylisted label is clicked.
 */

const URL_DENY_PATTERNS: RegExp[] = [
  /\/(delete|destroy|purge|wipe)(\b|\/|$)/i,
  /\/payouts?\b/i,
  /\/transfers?\b/i,
  /\/withdrawals?\b/i,
  /\/charge(s)?\b/i,
  /\/payments?\/(create|capture|confirm)\b/i,
  /\/(send|broadcast)-(sms|email|notification|push|whatsapp)\b/i,
  /\/admin\/.*\/(delete|ban|suspend|deactivate)\b/i,
  /stripe\.com\/v1\/(charges|payment_intents|refunds|transfers|payouts)/i,
  /api\.twilio\.com\/.*Messages/i,
  /api\.sendgrid\.com\/.*mail\/send/i,
  /ses\.[a-z0-9-]+\.amazonaws\.com\/.*SendEmail/i,
];

const DESTRUCTIVE_METHODS = new Set(['DELETE']);

const BUTTON_LABEL_DENY = [
  'delete',
  'remove permanently',
  'transfer',
  'withdraw',
  'payout',
  'send money',
  'broadcast',
  'wipe',
  'cancel account',
  'close account',
  'suspend user',
  'ban user',
];

export async function installDestructiveGuard(page: Page): Promise<void> {
  await page.route('**/*', async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method().toUpperCase();
    const dangerous =
      URL_DENY_PATTERNS.some((rx) => rx.test(url)) ||
      (DESTRUCTIVE_METHODS.has(method) && URL_DENY_PATTERNS.some((rx) => rx.test(url)));

    if (dangerous) {
      // eslint-disable-next-line no-console
      console.warn(`[destructive-guard] aborted ${method} ${url}`);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });

  await page.addInitScript((deny) => {
    const banned = (deny as string[]).map((s) => s.toLowerCase());
    document.addEventListener(
      'click',
      (ev) => {
        const t = ev.target as HTMLElement | null;
        if (!t) return;
        const label = (t.textContent || '').trim().toLowerCase();
        if (label && banned.some((b) => label.includes(b))) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          // eslint-disable-next-line no-console
          console.warn(`[destructive-guard] blocked click on "${label}"`);
        }
      },
      true,
    );
  }, BUTTON_LABEL_DENY);
}
