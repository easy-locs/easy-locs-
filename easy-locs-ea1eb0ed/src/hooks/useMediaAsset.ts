import { useState, useEffect, useMemo } from "react";
import { db } from "@/services/db";

interface MediaAssetMeta {
  lqip: string | null;
  variants: Array<{
    variant: string;
    width: number;
    height: number;
    url: string;
    format: string;
  }>;
}

const cache = new Map<string, MediaAssetMeta>();

export function useMediaAsset(src: string | undefined | null): MediaAssetMeta | null {
  const [meta, setMeta] = useState<MediaAssetMeta | null>(null);

  const cacheKey = useMemo(() => {
    if (!src) return null;
    const match = src.match(/\/storage\/v1\/(?:object|render)\/(?:image\/)?public\/([^?]+)/);
    if (!match) return null;
    const pathParts = match[1].split("/");
    if (pathParts.length < 2) return null;
    return { bucket: pathParts[0], path: pathParts.slice(1).join("/") };
  }, [src]);

  useEffect(() => {
    if (!cacheKey) return;

    const key = `${cacheKey.bucket}/${cacheKey.path}`;
    const cached = cache.get(key);
    if (cached) {
      setMeta(cached);
      return;
    }

    let cancelled = false;

    db.from("media_assets")
      .select("lqip_hash, variants")
      .eq("bucket", cacheKey.bucket)
      .eq("path", cacheKey.path)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          const result: MediaAssetMeta = {
            lqip: data.lqip_hash,
            variants: Array.isArray(data.variants) ? data.variants : [],
          };
          cache.set(key, result);
          setMeta(result);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [cacheKey]);

  return meta;
}
