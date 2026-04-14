import { useState, useCallback, useRef, memo, useMemo } from "react";
import { ImageOff } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  width?: number;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: string;
  lqip?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const VARIANT_WIDTHS = [200, 800, 1600] as const;

function isStorageUrl(url: string): boolean {
  return url.includes("supabase.co/storage") || url.includes("db.co/storage");
}

function buildTransformUrl(
  src: string,
  width: number,
  format: "webp" | "jpeg" = "webp",
  quality = 80,
): string {
  if (src.includes("/render/image/")) {
    return src;
  }

  const renderUrl = src.replace(
    /\/storage\/v1\/object\/public\//,
    "/storage/v1/render/image/public/"
  );
  const sep = renderUrl.includes("?") ? "&" : "?";
  return `${renderUrl}${sep}width=${width}&format=${format}&quality=${quality}`;
}

function buildOptimizedSrcSet(src: string, quality: number): string {
  return VARIANT_WIDTHS
    .map((w) => `${buildTransformUrl(src, w, "webp", quality)} ${w}w`)
    .join(", ");
}

function buildFallbackSrcSet(src: string, quality: number): string {
  return VARIANT_WIDTHS
    .map((w) => `${buildTransformUrl(src, w, "jpeg", quality)} ${w}w`)
    .join(", ");
}

function buildLegacySrcSet(src: string): string | undefined {
  if (!isStorageUrl(src)) return undefined;
  const sep = src.includes("?") ? "&" : "?";
  return [320, 640, 1024]
    .map((w) => `${src}${sep}width=${w}&quality=75 ${w}w`)
    .join(", ");
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = "",
  fallback,
  width,
  priority = false,
  sizes,
  aspectRatio,
  lqip,
  quality = 80,
  onLoad: onLoadProp,
  onError: onErrorProp,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    if (imgRef.current) {
      imgRef.current.style.opacity = "1";
      imgRef.current.style.filter = "blur(0)";
      imgRef.current.style.transform = "scale(1)";
    }
    setLoaded(true);
    onLoadProp?.();
  }, [onLoadProp]);

  const handleError = useCallback(() => {
    setError(true);
    onErrorProp?.();
  }, [onErrorProp]);

  const isStorage = useMemo(() => src ? isStorageUrl(src) : false, [src]);

  const canTransform = useMemo(
    () => isStorage && src.includes("/object/public/"),
    [isStorage, src]
  );

  const optimizedSrc = useMemo(() => {
    if (error) return fallback ?? "";
    if (!src) return fallback ?? "";
    if (width && canTransform) {
      return buildTransformUrl(src, width, "webp", quality);
    }
    if (width && isStorage) {
      const sep = src.includes("?") ? "&" : "?";
      return `${src}${sep}width=${width}&quality=${quality}`;
    }
    return src;
  }, [src, error, fallback, width, canTransform, isStorage, quality]);

  const srcSet = useMemo(() => {
    if (error || !src) return undefined;
    if (canTransform) return buildOptimizedSrcSet(src, quality);
    if (isStorage) return buildLegacySrcSet(src);
    return undefined;
  }, [src, error, canTransform, isStorage, quality]);

  const defaultSizes = sizes || "(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw";

  if (!src && !fallback) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <ImageOff className="h-6 w-6 text-muted-foreground/30" />
      </div>
    );
  }

  if (error && !fallback) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <ImageOff className="h-6 w-6 text-muted-foreground/30" />
      </div>
    );
  }

  const showLqip = !loaded && lqip;

  return (
    <div className={`relative overflow-hidden ${className}`} style={aspectRatio ? { aspectRatio } : undefined}>
      {showLqip && (
        <img
          src={lqip}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(20px)", transform: "scale(1.1)" }}
        />
      )}

      {canTransform && !error ? (
        <picture>
          <source
            srcSet={srcSet}
            sizes={defaultSizes}
            type="image/webp"
          />
          <source
            srcSet={buildFallbackSrcSet(src, quality)}
            sizes={defaultSizes}
            type="image/jpeg"
          />
          <img
            ref={imgRef}
            src={optimizedSrc || fallback || ""}
            alt={alt}
            className="w-full h-full object-cover"
            style={{
              opacity: loaded ? 1 : 0,
              filter: loaded ? "blur(0)" : "blur(8px)",
              transform: loaded ? "scale(1)" : "scale(1.02)",
              transition: "opacity 200ms ease-out, filter 250ms ease-out, transform 250ms ease-out",
            }}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
            onLoad={handleLoad}
            onError={handleError}
          />
        </picture>
      ) : (
        <img
          ref={imgRef}
          src={optimizedSrc || fallback || ""}
          alt={alt}
          srcSet={srcSet}
          sizes={srcSet ? defaultSizes : undefined}
          className={lqip ? "w-full h-full object-cover" : ""}
          style={{
            opacity: loaded ? 1 : 0,
            filter: loaded ? "blur(0)" : "blur(8px)",
            transform: loaded ? "scale(1)" : "scale(1.02)",
            transition: "opacity 200ms ease-out, filter 250ms ease-out, transform 250ms ease-out",
            ...(aspectRatio && !lqip ? { aspectRatio } : {}),
          }}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
});

export default OptimizedImage;
