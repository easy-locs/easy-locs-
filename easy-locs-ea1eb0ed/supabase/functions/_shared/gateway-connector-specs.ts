export interface ConnectorSpec {
  id: string;
  name: string;
  domain: string;
  pollingIntervalMin: number;
  type: "rest" | "rss" | "proxy";
  apiEndpoint: string;
}

export const CONNECTOR_SPECS: ConnectorSpec[] = [
  { id: "dld_transactions", name: "DLD Transactions", domain: "real_estate", pollingIntervalMin: 60, type: "rest", apiEndpoint: "https://gateway.dubailand.gov.ae/open-data/transactions/recent" },
  { id: "deliveroo_partner", name: "Deliveroo Partner", domain: "food_delivery", pollingIntervalMin: 30, type: "proxy", apiEndpoint: "https://api.deliveroo.com/partner/v1" },
  { id: "talabat_partner", name: "Talabat Partner", domain: "food_delivery", pollingIntervalMin: 30, type: "proxy", apiEndpoint: "https://api.talabat.com/partner/v1" },
  { id: "careem_partner", name: "Careem Partner", domain: "food_delivery", pollingIntervalMin: 30, type: "proxy", apiEndpoint: "https://api.careem.com/partner/v1" },
  { id: "openmeteo_weather", name: "OpenMeteo Weather", domain: "weather", pollingIntervalMin: 15, type: "rest", apiEndpoint: "https://api.open-meteo.com/v1/forecast" },
  { id: "google_news_rss", name: "Google News RSS", domain: "news", pollingIntervalMin: 10, type: "rss", apiEndpoint: "https://news.google.com/rss/search" },
  { id: "frankfurter_forex", name: "Frankfurter Forex", domain: "forex", pollingIntervalMin: 5, type: "rest", apiEndpoint: "https://api.frankfurter.app/latest" },
  { id: "aladhan_prayer_times", name: "Al-Adhan Prayer Times", domain: "prayer", pollingIntervalMin: 1440, type: "rest", apiEndpoint: "https://api.aladhan.com/v1/timings" },
];
