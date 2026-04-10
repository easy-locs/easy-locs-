import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  hreflangAlternates?: { lang: string; url: string }[];
  noindex?: boolean;
  keywords?: string;
  author?: string;
  ogType?: string;
}

const SITE_NAME = "Easy-Locs";
const DEFAULT_TITLE = "Easy-Locs — Super-App Food, Services, Taxi, Hotel, Delivery | 190+ Countries";
const DEFAULT_DESC = "Easy-Locs: commandez des repas, réservez un taxi, trouvez un hôtel, faites livrer, découvrez des services locaux — tout dans une seule app. 190+ pays, 120+ devises, 31 langues.";
const DEFAULT_IMAGE = "https://www.easy-locs.com/og-default.jpg";
const DEFAULT_KEYWORDS = "super app, food delivery, taxi, hotel booking, local services, delivery, restaurant, ride hailing, property management, marketplace, Easy-Locs";

const SEOHead = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  canonical,
  ogImage = DEFAULT_IMAGE,
  jsonLd,
  hreflangAlternates,
  noindex = false,
  keywords = DEFAULT_KEYWORDS,
  author = "Easy-Locs",
  ogType = "website",
}: SEOHeadProps) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("keywords", keywords);
    setMeta("author", author);
    setMeta("theme-color", "#121826");
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    setMeta("mobile-web-app-capable", "yes");

    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", ogType, true);
    setMeta("og:image", ogImage, true);
    setMeta("og:image:width", "1200", true);
    setMeta("og:image:height", "630", true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:locale", "en_US", true);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);
    setMeta("twitter:site", "@easylocs");

    setMeta("robots", noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
      setMeta("og:url", canonical, true);
    }

    if (hreflangAlternates?.length) {
      document.querySelectorAll('link[data-hreflang]').forEach(el => el.remove());
      for (const alt of hreflangAlternates) {
        const link = document.createElement("link");
        link.rel = "alternate";
        link.setAttribute("hreflang", alt.lang);
        link.href = alt.url;
        link.setAttribute("data-hreflang", "true");
        document.head.appendChild(link);
      }
    }

    if (jsonLd) {
      let script = document.getElementById("json-ld-seo") as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = "json-ld-seo";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }

    let preconnectSupabase = document.querySelector('link[href*="supabase"]') as HTMLLinkElement;
    if (!preconnectSupabase) {
      preconnectSupabase = document.createElement("link");
      preconnectSupabase.rel = "preconnect";
      preconnectSupabase.href = "https://ifvuvbolrmuuugtzxsfk.supabase.co";
      document.head.appendChild(preconnectSupabase);
    }

    let dnsPrefetch = document.querySelector('link[rel="dns-prefetch"][href*="googleapis"]') as HTMLLinkElement;
    if (!dnsPrefetch) {
      dnsPrefetch = document.createElement("link");
      dnsPrefetch.rel = "dns-prefetch";
      dnsPrefetch.href = "https://fonts.googleapis.com";
      document.head.appendChild(dnsPrefetch);
    }

    return () => {
      const script = document.getElementById("json-ld-seo");
      if (script) script.remove();
      document.querySelectorAll('link[data-hreflang]').forEach(el => el.remove());
    };
  }, [title, description, canonical, ogImage, jsonLd, hreflangAlternates, noindex, keywords, author, ogType]);

  return null;
};

export default SEOHead;
