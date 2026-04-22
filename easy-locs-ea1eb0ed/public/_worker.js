const BASE_URL = "https://www.easy-locs.com";

let cachedManifest = null;

async function getManifestAssets(env) {
  if (cachedManifest) return cachedManifest;
  try {
    const manifestReq = new Request("https://placeholder/.vite/manifest.json");
    const manifestResp = await env.ASSETS.fetch(manifestReq);
    if (manifestResp.ok) {
      const manifest = await manifestResp.json();
      const cssFiles = [];
      const jsFiles = [];
      for (const entry of Object.values(manifest)) {
        if (entry.file && entry.file.endsWith(".css")) cssFiles.push("/" + entry.file);
        if (entry.file && entry.file.endsWith(".js") && entry.isEntry) jsFiles.push("/" + entry.file);
        if (entry.css) {
          for (const css of entry.css) cssFiles.push("/" + css);
        }
      }
      cachedManifest = { css: cssFiles.slice(0, 3), js: jsFiles.slice(0, 2) };
      return cachedManifest;
    }
  } catch {
    // manifest not available
  }
  cachedManifest = { css: [], js: [] };
  return cachedManifest;
}

function deriveCanonical(pathname) {
  const clean = pathname.endsWith("/index.html")
    ? pathname.replace(/\/index\.html$/, "")
    : pathname.replace(/\.html$/, "");
  const normalized = clean === "" ? "/" : clean.replace(/\/$/, "");
  return `${BASE_URL}${normalized}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const isDocument = pathname === "/" || pathname.endsWith(".html") || (!pathname.includes(".") && !pathname.startsWith("/assets/"));

    if (isDocument) {
      const assets = await getManifestAssets(env);

      const linkHeaders = [
        '<https://fonts.googleapis.com>; rel="preconnect"',
        '<https://fonts.gstatic.com>; rel="preconnect"; crossorigin',
      ];
      for (const css of assets.css) {
        linkHeaders.push(`<${css}>; rel="preload"; as="style"`);
      }
      for (const js of assets.js) {
        linkHeaders.push(`<${js}>; rel="modulepreload"`);
      }

      const canonical = deriveCanonical(pathname);
      linkHeaders.push(`<${canonical}>; rel="canonical"`);

      let response = await env.ASSETS.fetch(request);

      // SPA fallback: if the static asset does not exist (404), serve index.html
      // so client-side routing can handle the path (e.g. /login, /dashboard).
      if (response.status === 404) {
        const indexRequest = new Request(new URL("/index.html", request.url).toString(), { method: "GET" });
        response = await env.ASSETS.fetch(indexRequest);
      }

      const headers = new Headers(response.headers);
      for (const link of linkHeaders) {
        headers.append("Link", link);
      }
      headers.set("X-Robots-Tag", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
