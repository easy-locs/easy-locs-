import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server, type IncomingMessage } from "http";
import { AddressInfo } from "net";
import {
  rssHeader,
  atomHeader,
  pingWebSubHub,
  getWebSubHubs,
} from "../../../vite-plugin-feeds";

interface ReceivedPing {
  url: string;
  contentType: string | undefined;
  body: string;
  params: Record<string, string>;
}

function startMockHub(): Promise<{ server: Server; url: string; received: ReceivedPing[] }> {
  return new Promise((resolve) => {
    const received: ReceivedPing[] = [];
    const server = createServer((req: IncomingMessage, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        const params = Object.fromEntries(new URLSearchParams(body).entries());
        received.push({
          url: req.url || "/",
          contentType: req.headers["content-type"],
          body,
          params,
        });
        res.writeHead(204);
        res.end();
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${addr.port}/`, received });
    });
  });
}

describe("WebSub feed integration", () => {
  describe("hub link advertisement", () => {
    it("RSS header advertises every configured hub via <atom:link rel=\"hub\">", () => {
      const hubs = [
        "https://pubsubhubbub.appspot.com/",
        "https://pubsubhubbub.superfeedr.com/",
      ];
      const xml = rssHeader(
        "Easy-Locs — Updates",
        "desc",
        "https://easy-locs.com/feed.xml",
        new Date(0).toUTCString(),
        hubs,
      );
      for (const hub of hubs) {
        expect(xml).toContain(`<atom:link href="${hub}" rel="hub" />`);
      }
      expect(xml).toContain('<atom:link href="https://easy-locs.com/feed.xml" rel="self"');
    });

    it("Atom header advertises every configured hub via <link rel=\"hub\">", () => {
      const hubs = ["https://hub.example/"];
      const xml = atomHeader(
        "Easy-Locs — Updates",
        "https://easy-locs.com/feed/atom.xml",
        new Date(0).toISOString(),
        "https://easy-locs.com/feed/atom.xml",
        hubs,
      );
      expect(xml).toContain('<link href="https://hub.example/" rel="hub" />');
    });

    it("getWebSubHubs honors WEBSUB_HUBS override and falls back to defaults", () => {
      const originalHubs = process.env.WEBSUB_HUBS;
      const originalHub = process.env.WEBSUB_HUB;
      try {
        delete process.env.WEBSUB_HUBS;
        delete process.env.WEBSUB_HUB;
        const defaults = getWebSubHubs();
        expect(defaults.length).toBeGreaterThan(0);
        expect(defaults.every(h => h.startsWith("https://"))).toBe(true);

        process.env.WEBSUB_HUBS = "https://a.example/, https://b.example/";
        const override = getWebSubHubs();
        expect(override).toEqual(["https://a.example/", "https://b.example/"]);
      } finally {
        if (originalHubs === undefined) delete process.env.WEBSUB_HUBS;
        else process.env.WEBSUB_HUBS = originalHubs;
        if (originalHub === undefined) delete process.env.WEBSUB_HUB;
        else process.env.WEBSUB_HUB = originalHub;
      }
    });
  });

  describe("publish notification reaches a subscriber-receiving hub", () => {
    let mock: Awaited<ReturnType<typeof startMockHub>>;

    beforeAll(async () => {
      mock = await startMockHub();
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => mock.server.close(() => resolve()));
    });

    it("delivers a WebSub publish notification to the hub for each feed URL", async () => {
      const feeds = [
        "https://easy-locs.com/feed.xml",
        "https://easy-locs.com/feed/atom.xml",
        "https://easy-locs.com/feed/cities.xml",
        "https://easy-locs.com/feed/cities-atom.xml",
        "https://easy-locs.com/feed/services.xml",
        "https://easy-locs.com/feed/services-atom.xml",
      ];

      const results = await Promise.all(feeds.map(f => pingWebSubHub(mock.url, f)));

      for (const r of results) {
        expect(r.ok, `ping for ${r.feedUrl} failed: ${r.error ?? r.status}`).toBe(true);
        expect(r.status).toBe(204);
      }

      expect(mock.received).toHaveLength(feeds.length);
      for (const ping of mock.received) {
        expect(ping.contentType).toMatch(/application\/x-www-form-urlencoded/);
        expect(ping.params["hub.mode"]).toBe("publish");
        expect(feeds).toContain(ping.params["hub.url"]);
      }

      const notifiedFeedUrls = new Set(mock.received.map(p => p.params["hub.url"]));
      for (const f of feeds) {
        expect(notifiedFeedUrls.has(f)).toBe(true);
      }
    });

    it("returns ok=false (without throwing) when the hub is unreachable", async () => {
      const r = await pingWebSubHub("http://127.0.0.1:1/", "https://easy-locs.com/feed.xml");
      expect(r.ok).toBe(false);
      expect(typeof r.error === "string" || r.status === 0).toBe(true);
    });
  });
});
