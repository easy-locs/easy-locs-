import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, NormalizedDataPoint } from "../types";

const NEWS_CONFIG: ConnectorConfig = {
  id: "google_news_rss",
  name: "Google News RSS",
  description: "News aggregation via Google News RSS feeds proxied through Supabase Edge Function",
  type: "rss",
  domain: "news",
  pollingIntervalMs: 600_000,
  authMethod: "none",
  baseUrl: "https://news.google.com/rss",
  readOnlyEndpoints: ["/rss"],
  enabled: true,
  tags: ["news", "rss", "global", "free"],
  quotaLimit: 0,
  quotaWindowMs: 0,
  timeoutMs: 8_000,
  retryCount: 2,
};

export class NewsConnector extends BaseConnector {
  constructor() {
    super(NEWS_CONFIG);
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const response = await fetch(
      `${this.config.baseUrl}?hl=en&gl=AE&ceid=AE:en`,
      { signal: AbortSignal.timeout(this.config.timeoutMs ?? 8_000) }
    );

    if (!response.ok) throw new Error(`Google News RSS returned ${response.status}`);

    const rawText = await response.text();
    const rawSize = new TextEncoder().encode(rawText).byteLength;
    const now = Date.now();

    const items = this.parseRss(rawText);

    return items.map((item) => ({
      connectorId: this.config.id,
      domain: this.config.domain,
      timestamp: now,
      data: item,
      rawSize: Math.round(rawSize / Math.max(items.length, 1)),
      normalizedAt: now,
    }));
  }

  private parseRss(xml: string): Record<string, unknown>[] {
    const items: Record<string, unknown>[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = this.extractTag(itemXml, "title");
      const link = this.extractTag(itemXml, "link");
      const pubDate = this.extractTag(itemXml, "pubDate");
      const source = this.extractTag(itemXml, "source");
      items.push({ source: "google_news_rss", title, link, pubDate, newsSource: source });
    }
    return items;
  }

  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
    const match = regex.exec(xml);
    return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
  }

  protected async doHealthCheck(): Promise<boolean> {
    const response = await fetch(
      `${this.config.baseUrl}?hl=en&gl=AE&ceid=AE:en`,
      { signal: AbortSignal.timeout(5_000) }
    );
    return response.ok;
  }
}

export const newsConnector = new NewsConnector();
