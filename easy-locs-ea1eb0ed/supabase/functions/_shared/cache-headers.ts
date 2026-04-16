export interface CacheHeaderOptions {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  isPrivate?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  etag?: string;
  vary?: string[];
}

const PRESETS: Record<string, CacheHeaderOptions> = {
  immutable: {
    maxAge: 31536000,
    sMaxAge: 31536000,
    isPrivate: false,
  },
  static: {
    maxAge: 3600,
    sMaxAge: 86400,
    staleWhileRevalidate: 60,
    isPrivate: false,
  },
  listing: {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 30,
    staleIfError: 3600,
    isPrivate: false,
    vary: ["Accept-Encoding"],
  },
  search: {
    maxAge: 30,
    sMaxAge: 120,
    staleWhileRevalidate: 15,
    isPrivate: false,
    vary: ["Accept-Encoding"],
  },
  user_data: {
    maxAge: 0,
    isPrivate: true,
    mustRevalidate: true,
    vary: ["Authorization", "Accept-Encoding"],
  },
  mutation: {
    noStore: true,
    isPrivate: true,
  },
  dashboard: {
    maxAge: 30,
    sMaxAge: 60,
    staleWhileRevalidate: 30,
    isPrivate: true,
    vary: ["Authorization", "Accept-Encoding"],
  },
  health: {
    maxAge: 5,
    sMaxAge: 10,
    isPrivate: false,
  },
};

export function buildCacheHeaders(
  options: CacheHeaderOptions | string,
): Record<string, string> {
  const opts = typeof options === "string"
    ? PRESETS[options] || PRESETS.mutation
    : options;

  if (opts.noStore) {
    return { "Cache-Control": "no-store, no-cache, must-revalidate" };
  }

  const directives: string[] = [];
  directives.push(opts.isPrivate ? "private" : "public");

  if (opts.maxAge !== undefined) directives.push(`max-age=${opts.maxAge}`);
  if (opts.sMaxAge !== undefined) directives.push(`s-maxage=${opts.sMaxAge}`);
  if (opts.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${opts.staleWhileRevalidate}`);
  }
  if (opts.staleIfError !== undefined) {
    directives.push(`stale-if-error=${opts.staleIfError}`);
  }
  if (opts.mustRevalidate) directives.push("must-revalidate");

  const headers: Record<string, string> = {
    "Cache-Control": directives.join(", "),
  };

  if (opts.etag) {
    headers["ETag"] = `W/"${opts.etag}"`;
  }

  if (opts.vary && opts.vary.length > 0) {
    headers["Vary"] = opts.vary.join(", ");
  }

  return headers;
}

export function generateETag(body: string): string {
  let hash = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function checkConditionalRequest(
  req: Request,
  currentETag: string,
  extraHeaders?: Record<string, string>,
): Response | null {
  const ifNoneMatch = req.headers.get("If-None-Match");
  const quotedETag = `W/"${currentETag}"`;
  if (ifNoneMatch && (ifNoneMatch === quotedETag || ifNoneMatch === `"${currentETag}"`)) {
    return new Response(null, {
      status: 304,
      headers: {
        "ETag": quotedETag,
        "Cache-Control": "must-revalidate",
        ...extraHeaders,
      },
    });
  }
  return null;
}

export function applyCacheHeaders(
  response: Response,
  preset: string,
  body?: string,
): Response {
  const cacheHeaders = buildCacheHeaders(preset);
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(cacheHeaders)) {
    headers.set(key, value);
  }

  if (body) {
    const etag = generateETag(body);
    headers.set("ETag", `W/"${etag}"`);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { PRESETS as CACHE_PRESETS };
