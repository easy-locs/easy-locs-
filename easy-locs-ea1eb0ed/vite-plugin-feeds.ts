import type { Plugin } from "vite";
import {
  BUILD_SERVICE_CATEGORIES, BUILD_ACTIVITY_TYPES,
  BUILD_COUNTRIES, EXTENDED_CITY_SLUGS, BASE_URL,
  getBuildPhase1Cities, CONTENT_LASTMOD,
} from "./vite-seo-data";

const DEFAULT_WEBSUB_HUBS = [
  "https://pubsubhubbub.appspot.com/",
  "https://pubsubhubbub.superfeedr.com/",
];

function getWebSubHubs(): string[] {
  const raw = process.env.WEBSUB_HUBS || process.env.WEBSUB_HUB;
  if (!raw) return DEFAULT_WEBSUB_HUBS;
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rssHeader(title: string, description: string, link: string, buildDate: string, hubs: string[]): string {
  const hubLinks = hubs
    .map(h => `  <atom:link href="${h}" rel="hub" />`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escXml(title)}</title>
  <description>${escXml(description)}</description>
  <link>${link}</link>
  <language>en</language>
  <lastBuildDate>${buildDate}</lastBuildDate>
  <atom:link href="${link}" rel="self" type="application/rss+xml" />
${hubLinks}
  <generator>Easy-Locs SEO Build</generator>`;
}

function rssItem(title: string, link: string, description: string, pubDate: string, guid?: string): string {
  return `  <item>
    <title>${escXml(title)}</title>
    <link>${link}</link>
    <description>${escXml(description)}</description>
    <pubDate>${pubDate}</pubDate>
    <guid isPermaLink="true">${guid || link}</guid>
  </item>`;
}

function atomHeader(title: string, id: string, updated: string, selfHref: string, hubs: string[]): string {
  const hubLinks = hubs
    .map(h => `  <link href="${h}" rel="hub" />`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escXml(title)}</title>
  <id>${id}</id>
  <updated>${updated}</updated>
  <link href="${selfHref}" rel="self" type="application/atom+xml" />
  <link href="${BASE_URL}" rel="alternate" type="text/html" />
${hubLinks}
  <author><name>Easy-Locs</name><uri>${BASE_URL}</uri></author>
  <generator>Easy-Locs SEO Build</generator>`;
}

function atomEntry(title: string, link: string, summary: string, updated: string, id?: string): string {
  return `  <entry>
    <title>${escXml(title)}</title>
    <link href="${link}" rel="alternate" type="text/html" />
    <id>${id || link}</id>
    <updated>${updated}</updated>
    <summary>${escXml(summary)}</summary>
  </entry>`;
}

async function pingWebSubHub(hub: string, feedUrl: string): Promise<{ hub: string; feedUrl: string; status: number; ok: boolean; error?: string }> {
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

export function feedsPlugin(): Plugin {
  return {
    name: "generate-rss-feeds",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        const fs = await import("fs");
        const path = await import("path");

        const distDir = path.resolve("dist");
        if (!fs.existsSync(distDir)) {
          console.warn("[feeds] dist/ not found, skipping");
          return;
        }

        const now = new Date();
        const buildDate = now.toUTCString();
        const atomDate = now.toISOString();
        const feedDir = path.resolve(distDir, "feed");
        fs.mkdirSync(feedDir, { recursive: true });

        const hubs = getWebSubHubs();

        const cities = getBuildPhase1Cities();

        const globalItems: string[] = [];
        const globalAtomEntries: string[] = [];

        for (const city of cities.slice(0, 30)) {
          const title = `${city.name} — Food, Services, Taxi & Hotel`;
          const link = `${BASE_URL}/city/${city.slug}`;
          const desc = `Discover food delivery, taxi rides, hotels, and local services in ${city.name}. Book online with Easy-Locs.`;
          globalItems.push(rssItem(title, link, desc, buildDate));
          globalAtomEntries.push(atomEntry(title, link, desc, `${CONTENT_LASTMOD.cities}T00:00:00Z`));
        }
        for (const svc of BUILD_SERVICE_CATEGORIES.slice(0, 10)) {
          const title = `${svc.label} Services Worldwide`;
          const link = `${BASE_URL}/services/${svc.slug}`;
          globalItems.push(rssItem(title, link, svc.description, buildDate));
          globalAtomEntries.push(atomEntry(title, link, svc.description, `${CONTENT_LASTMOD.services}T00:00:00Z`));
        }
        for (const city of cities.slice(0, 15)) {
          const gTitle = `Guide: Living, Working & Visiting ${city.name}`;
          const gLink = `${BASE_URL}/guide/${city.slug}`;
          const gDesc = `In-depth guide to ${city.name}, ${city.countryName}: services, costs, transit, neighborhoods and tips.`;
          globalItems.push(rssItem(gTitle, gLink, gDesc, buildDate));
          globalAtomEntries.push(atomEntry(gTitle, gLink, gDesc, `${CONTENT_LASTMOD.guides}T00:00:00Z`));

          const topSvc = BUILD_SERVICE_CATEGORIES[0];
          if (topSvc) {
            const bTitle = `Best ${topSvc.label} in ${city.name}`;
            const bLink = `${BASE_URL}/best/${topSvc.slug}/in/${city.slug}`;
            const bDesc = `Top-rated ${topSvc.label.toLowerCase()} providers in ${city.name}, vetted and ranked by Easy-Locs.`;
            globalItems.push(rssItem(bTitle, bLink, bDesc, buildDate));
            globalAtomEntries.push(atomEntry(bTitle, bLink, bDesc, `${CONTENT_LASTMOD.best}T00:00:00Z`));

            const cTitle = `Compare ${topSvc.label} options in ${city.name}`;
            const cLink = `${BASE_URL}/compare/${topSvc.slug}/in/${city.slug}`;
            const cDesc = `Side-by-side comparison of ${topSvc.label.toLowerCase()} providers in ${city.name} — pricing, ratings, and availability.`;
            globalItems.push(rssItem(cTitle, cLink, cDesc, buildDate));
            globalAtomEntries.push(atomEntry(cTitle, cLink, cDesc, `${CONTENT_LASTMOD.compare}T00:00:00Z`));
          }
        }

        const globalFeedUrl = `${BASE_URL}/feed.xml`;
        const globalFeed = [
          rssHeader("Easy-Locs — Updates", "Latest cities, services, and marketplace updates from Easy-Locs", globalFeedUrl, buildDate, hubs),
          ...globalItems,
          "</channel>\n</rss>",
        ].join("\n");
        fs.writeFileSync(path.resolve(distDir, "feed.xml"), globalFeed, "utf-8");

        const globalAtomUrl = `${BASE_URL}/feed/atom.xml`;
        const globalAtom = [
          atomHeader("Easy-Locs — Updates", globalAtomUrl, atomDate, globalAtomUrl, hubs),
          ...globalAtomEntries,
          "</feed>",
        ].join("\n");
        fs.writeFileSync(path.resolve(feedDir, "atom.xml"), globalAtom, "utf-8");

        const cityItems: string[] = [];
        const cityAtomEntries: string[] = [];
        for (const city of cities) {
          const title = `${city.name}, ${city.countryName}`;
          const link = `${BASE_URL}/city/${city.slug}`;
          const desc = `${city.localContext.slice(0, 200)}`;
          cityItems.push(rssItem(title, link, desc, buildDate));
          cityAtomEntries.push(atomEntry(title, link, desc, `${CONTENT_LASTMOD.cities}T00:00:00Z`));
        }
        const citiesFeedUrl = `${BASE_URL}/feed/cities.xml`;
        const citiesFeed = [
          rssHeader("Easy-Locs — Cities", "City coverage updates from Easy-Locs", citiesFeedUrl, buildDate, hubs),
          ...cityItems,
          "</channel>\n</rss>",
        ].join("\n");
        fs.writeFileSync(path.resolve(feedDir, "cities.xml"), citiesFeed, "utf-8");

        const citiesAtomUrl = `${BASE_URL}/feed/cities-atom.xml`;
        const citiesAtom = [
          atomHeader("Easy-Locs — Cities", citiesAtomUrl, atomDate, citiesAtomUrl, hubs),
          ...cityAtomEntries,
          "</feed>",
        ].join("\n");
        fs.writeFileSync(path.resolve(feedDir, "cities-atom.xml"), citiesAtom, "utf-8");

        const svcItems: string[] = [];
        const svcAtomEntries: string[] = [];
        for (const svc of BUILD_SERVICE_CATEGORIES) {
          const title = `${svc.label} — Easy-Locs`;
          const link = `${BASE_URL}/services/${svc.slug}`;
          svcItems.push(rssItem(title, link, svc.description, buildDate));
          svcAtomEntries.push(atomEntry(title, link, svc.description, `${CONTENT_LASTMOD.services}T00:00:00Z`));
        }
        for (const act of BUILD_ACTIVITY_TYPES) {
          const title = `${act.label} Activities — Easy-Locs`;
          const link = `${BASE_URL}/activities/${act.slug}/in/${cities[0]?.slug || "paris"}`;
          const desc = `Book ${act.label.toLowerCase()} experiences worldwide with Easy-Locs.`;
          svcItems.push(rssItem(title, link, desc, buildDate));
          svcAtomEntries.push(atomEntry(title, link, desc, `${CONTENT_LASTMOD.activities}T00:00:00Z`));
        }
        const servicesFeedUrl = `${BASE_URL}/feed/services.xml`;
        const servicesFeed = [
          rssHeader("Easy-Locs — Services", "Service and activity updates from Easy-Locs", servicesFeedUrl, buildDate, hubs),
          ...svcItems,
          "</channel>\n</rss>",
        ].join("\n");
        fs.writeFileSync(path.resolve(feedDir, "services.xml"), servicesFeed, "utf-8");

        const servicesAtomUrl = `${BASE_URL}/feed/services-atom.xml`;
        const servicesAtom = [
          atomHeader("Easy-Locs — Services", servicesAtomUrl, atomDate, servicesAtomUrl, hubs),
          ...svcAtomEntries,
          "</feed>",
        ].join("\n");
        fs.writeFileSync(path.resolve(feedDir, "services-atom.xml"), servicesAtom, "utf-8");

        console.log(`[feeds] ✓ Generated 3 RSS feeds + 3 Atom feeds (feed.xml: ${globalItems.length} items, cities.xml: ${cityItems.length}, services.xml: ${svcItems.length}) + Atom variants`);

        const feedUrls = [
          globalFeedUrl,
          globalAtomUrl,
          citiesFeedUrl,
          citiesAtomUrl,
          servicesFeedUrl,
          servicesAtomUrl,
        ];

        if (process.env.WEBSUB_SKIP === "true") {
          console.log(`[websub] Skipped hub notifications (WEBSUB_SKIP=true). Hubs advertised: ${hubs.join(", ")}`);
          return;
        }

        console.log(`[websub] Advertising ${hubs.length} hub(s): ${hubs.join(", ")}`);
        console.log(`[websub] Pinging hubs for ${feedUrls.length} feed URLs...`);
        const pings = hubs.flatMap(hub => feedUrls.map(url => pingWebSubHub(hub, url)));
        const results = await Promise.allSettled(pings);
        let okCount = 0;
        let failCount = 0;
        for (const r of results) {
          if (r.status === "fulfilled") {
            const { hub, feedUrl, status, ok, error } = r.value;
            if (ok) {
              okCount++;
            } else {
              failCount++;
              console.warn(`[websub] ✗ ${hub} ← ${feedUrl} (HTTP ${status}${error ? `, ${error}` : ""})`);
            }
          } else {
            failCount++;
          }
        }
        console.log(`[websub] ✓ ${okCount} hub notifications succeeded, ${failCount} failed`);
      },
    },
  };
}
