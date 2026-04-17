import type { Plugin } from "vite";
import {
  BUILD_SERVICE_CATEGORIES, BUILD_ACTIVITY_TYPES,
  BUILD_COUNTRIES, EXTENDED_CITY_SLUGS, BASE_URL,
  getBuildPhase1Cities, CONTENT_LASTMOD,
} from "./vite-seo-data";

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rssHeader(title: string, description: string, link: string, buildDate: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escXml(title)}</title>
  <description>${escXml(description)}</description>
  <link>${link}</link>
  <language>en</language>
  <lastBuildDate>${buildDate}</lastBuildDate>
  <atom:link href="${link}" rel="self" type="application/rss+xml" />
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

function atomHeader(title: string, id: string, updated: string, selfHref: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escXml(title)}</title>
  <id>${id}</id>
  <updated>${updated}</updated>
  <link href="${selfHref}" rel="self" type="application/atom+xml" />
  <link href="${BASE_URL}" rel="alternate" type="text/html" />
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
          }
        }

        const globalFeed = [
          rssHeader("Easy-Locs — Updates", "Latest cities, services, and marketplace updates from Easy-Locs", `${BASE_URL}/feed.xml`, buildDate),
          ...globalItems,
          "</channel>\n</rss>",
        ].join("\n");
        fs.writeFileSync(path.resolve(distDir, "feed.xml"), globalFeed, "utf-8");

        const globalAtom = [
          atomHeader("Easy-Locs — Updates", `${BASE_URL}/feed/atom.xml`, atomDate, `${BASE_URL}/feed/atom.xml`),
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
        const citiesFeed = [
          rssHeader("Easy-Locs — Cities", "City coverage updates from Easy-Locs", `${BASE_URL}/feed/cities.xml`, buildDate),
          ...cityItems,
          "</channel>\n</rss>",
        ].join("\n");
        fs.writeFileSync(path.resolve(feedDir, "cities.xml"), citiesFeed, "utf-8");

        const citiesAtom = [
          atomHeader("Easy-Locs — Cities", `${BASE_URL}/feed/cities-atom.xml`, atomDate, `${BASE_URL}/feed/cities-atom.xml`),
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
        const servicesFeed = [
          rssHeader("Easy-Locs — Services", "Service and activity updates from Easy-Locs", `${BASE_URL}/feed/services.xml`, buildDate),
          ...svcItems,
          "</channel>\n</rss>",
        ].join("\n");
        fs.writeFileSync(path.resolve(feedDir, "services.xml"), servicesFeed, "utf-8");

        const servicesAtom = [
          atomHeader("Easy-Locs — Services", `${BASE_URL}/feed/services-atom.xml`, atomDate, `${BASE_URL}/feed/services-atom.xml`),
          ...svcAtomEntries,
          "</feed>",
        ].join("\n");
        fs.writeFileSync(path.resolve(feedDir, "services-atom.xml"), servicesAtom, "utf-8");

        console.log(`[feeds] ✓ Generated 3 RSS feeds + 3 Atom feeds (feed.xml: ${globalItems.length} items, cities.xml: ${cityItems.length}, services.xml: ${svcItems.length}) + Atom variants`);
      },
    },
  };
}
