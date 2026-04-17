#!/usr/bin/env tsx
/**
 * Standalone WebSub/PubSubHubbub hub ping script.
 *
 * Notifies configured WebSub hubs that the site's RSS/Atom feeds have been
 * updated, so subscribers receive new cities/services/guides within minutes
 * instead of waiting for the next manual refresh.
 *
 * Usage:
 *   npx tsx scripts/websub-ping.ts
 *
 * Env vars:
 *   BASE_URL       — site base URL (defaults to https://easy-locs.com)
 *   WEBSUB_HUBS    — comma-separated hub URLs (overrides defaults)
 *   WEBSUB_HUB     — single hub URL (overrides defaults)
 *   WEBSUB_SKIP    — when "true", logs intended pings without sending
 *
 * Designed to be run on a schedule (cron / GitHub Actions) so feed
 * subscribers are re-notified periodically even between deploys.
 */

const DEFAULT_HUBS = [
  "https://pubsubhubbub.appspot.com/",
  "https://pubsubhubbub.superfeedr.com/",
];

function getHubs(): string[] {
  const raw = process.env.WEBSUB_HUBS || process.env.WEBSUB_HUB;
  if (!raw) return DEFAULT_HUBS;
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function getBaseUrl(): string {
  return (process.env.BASE_URL || "https://easy-locs.com").replace(/\/$/, "");
}

function getFeedUrls(base: string): string[] {
  return [
    `${base}/feed.xml`,
    `${base}/feed/atom.xml`,
    `${base}/feed/cities.xml`,
    `${base}/feed/cities-atom.xml`,
    `${base}/feed/services.xml`,
    `${base}/feed/services-atom.xml`,
  ];
}

async function pingHub(hub: string, feedUrl: string) {
  const body = new URLSearchParams({ "hub.mode": "publish", "hub.url": feedUrl }).toString();
  try {
    const response = await fetch(hub, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10000),
    });
    return { hub, feedUrl, status: response.status, ok: response.ok };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { hub, feedUrl, status: 0, ok: false, error: message };
  }
}

async function main() {
  const hubs = getHubs();
  const base = getBaseUrl();
  const feeds = getFeedUrls(base);

  console.log(`[websub] Base URL: ${base}`);
  console.log(`[websub] Hubs: ${hubs.join(", ")}`);
  console.log(`[websub] Feeds: ${feeds.length}`);

  if (process.env.WEBSUB_SKIP === "true") {
    for (const hub of hubs) {
      for (const feed of feeds) {
        console.log(`[websub] (skip) would POST hub.mode=publish hub.url=${feed} → ${hub}`);
      }
    }
    return;
  }

  const tasks = hubs.flatMap(hub => feeds.map(feed => pingHub(hub, feed)));
  const results = await Promise.allSettled(tasks);

  let okCount = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      const { hub, feedUrl, status, ok, error } = r.value;
      if (ok) {
        okCount++;
        console.log(`[websub] ✓ ${hub} ← ${feedUrl} (HTTP ${status})`);
      } else {
        failCount++;
        console.warn(`[websub] ✗ ${hub} ← ${feedUrl} (HTTP ${status}${error ? `, ${error}` : ""})`);
      }
    } else {
      failCount++;
      console.warn(`[websub] ✗ ping rejected: ${String(r.reason)}`);
    }
  }
  console.log(`[websub] ${okCount} succeeded, ${failCount} failed`);
  if (okCount === 0 && failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error("[websub] fatal:", err);
  process.exit(1);
});
