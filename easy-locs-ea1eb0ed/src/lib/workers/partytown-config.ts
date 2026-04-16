export interface PartytownConfig {
  debug?: boolean;
  forward: string[];
  resolveUrl?: (url: URL, location: URL, type: string) => URL | undefined;
}

export function getPartytownConfig(): PartytownConfig {
  return {
    debug: import.meta.env.DEV,
    forward: [
      "dataLayer.push",
      "analytics.track",
      "analytics.identify",
      "analytics.page",
      "analytics.group",
      "posthog.capture",
      "posthog.identify",
      "posthog.reset",
      "fbq",
      "gtag",
    ],
    resolveUrl: (url: URL, _location: URL, type: string) => {
      const proxyDomains = [
        "cdn.segment.com",
        "api.segment.io",
        "us.i.posthog.com",
        "eu.i.posthog.com",
        "www.google-analytics.com",
        "www.googletagmanager.com",
      ];

      if (type === "script" && proxyDomains.some((d) => url.hostname.includes(d))) {
        const proxyUrl = new URL(`https://cdn.builder.codes/api/v1/proxy-api`);
        proxyUrl.searchParams.set("url", url.href);
        return proxyUrl;
      }

      return undefined;
    },
  };
}

export function getPartytownScripts(): Array<{
  src: string;
  type: "text/partytown";
  attrs?: Record<string, string>;
}> {
  const scripts: Array<{
    src: string;
    type: "text/partytown";
    attrs?: Record<string, string>;
  }> = [];

  const segmentKey = import.meta.env.VITE_SEGMENT_WRITE_KEY;
  if (segmentKey) {
    scripts.push({
      src: `https://cdn.segment.com/analytics.js/v1/${segmentKey}/analytics.min.js`,
      type: "text/partytown",
    });
  }

  return scripts;
}

export function shouldUsePartytown(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    import.meta.env.PROD
  );
}
