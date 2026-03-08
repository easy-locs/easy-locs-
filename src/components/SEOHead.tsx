import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown>;
  hreflangAlternates?: { lang: string; url: string }[];
}

const SEOHead = ({
  title = "Easy-Locs — Property Management Software for Landlords Worldwide",
  description = "Manage rental properties in 110+ countries. Leases, receipts, tenant portal, accounting — all-in-one platform for landlords. Free to start.",
  canonical,
  ogImage = "https://www.easy-locs.com/pwa-512x512.png",
  jsonLd,
  hreflangAlternates,
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
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);
    setMeta("og:image", ogImage, true);
    setMeta("og:image:width", "1200", true);
    setMeta("og:image:height", "630", true);
    setMeta("og:site_name", "Easy-Locs", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);
    // Robots
    setMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1");

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

    // hreflang alternates
    if (hreflangAlternates?.length) {
      // Remove old hreflang links
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

    return () => {
      const script = document.getElementById("json-ld-seo");
      if (script) script.remove();
      document.querySelectorAll('link[data-hreflang]').forEach(el => el.remove());
    };
  }, [title, description, canonical, ogImage, jsonLd, hreflangAlternates]);

  return null;
};

export default SEOHead;
