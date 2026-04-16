import type { DataDomain } from "./types";

export interface ConnectorSpec {
  id: string;
  name: string;
  domain: DataDomain;
  pollingIntervalMs: number;
  pollingIntervalMin: number;
  apiEndpoint: string;
  type: "rest" | "rss" | "proxy";
}

export const CONNECTOR_SPECS: ConnectorSpec[] = [
  { id: "dld_transactions", name: "DLD Transactions", domain: "real_estate", pollingIntervalMs: 3_600_000, pollingIntervalMin: 60, apiEndpoint: "https://gateway.dubailand.gov.ae/open-data/transactions/recent", type: "rest" },
  { id: "deliveroo_partner", name: "Deliveroo Partner", domain: "food_delivery", pollingIntervalMs: 1_800_000, pollingIntervalMin: 30, apiEndpoint: "https://api.deliveroo.com/partner/v1", type: "proxy" },
  { id: "talabat_partner", name: "Talabat Partner", domain: "food_delivery", pollingIntervalMs: 1_800_000, pollingIntervalMin: 30, apiEndpoint: "https://api.talabat.com/partner/v1", type: "proxy" },
  { id: "careem_partner", name: "Careem Partner", domain: "food_delivery", pollingIntervalMs: 1_800_000, pollingIntervalMin: 30, apiEndpoint: "https://api.careem.com/partner/v1", type: "proxy" },
  { id: "openmeteo_weather", name: "OpenMeteo Weather", domain: "weather", pollingIntervalMs: 900_000, pollingIntervalMin: 15, apiEndpoint: "https://api.open-meteo.com/v1/forecast", type: "rest" },
  { id: "google_news_rss", name: "Google News RSS", domain: "news", pollingIntervalMs: 600_000, pollingIntervalMin: 10, apiEndpoint: "https://news.google.com/rss/search", type: "rss" },
  { id: "frankfurter_forex", name: "Frankfurter Forex", domain: "forex", pollingIntervalMs: 300_000, pollingIntervalMin: 5, apiEndpoint: "https://api.frankfurter.app/latest", type: "rest" },
  { id: "aladhan_prayer_times", name: "Al-Adhan Prayer Times", domain: "prayer", pollingIntervalMs: 86_400_000, pollingIntervalMin: 1440, apiEndpoint: "https://api.aladhan.com/v1/timings", type: "rest" },
];

export function getConnectorSpec(id: string): ConnectorSpec | undefined {
  return CONNECTOR_SPECS.find((spec) => spec.id === id);
}
