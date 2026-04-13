import { useState, useCallback, useRef, memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  width?: number;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: string;
}

function buildSrcSet(src: string, widths: number[]): string | undefined {
  if (!src.includes("db.co/storage")) return undefined;
  const sep = src.includes("?") ? "&" : "?";
  return widths
    .map(w => `${src}${sep}width=${w}&quality=75 ${w}w`)
    .join(", ");
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = "",
  fallback = "/placeholder.svg",
  width,
  priority = false,
  sizes,
  aspectRatio,
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
  }, []);
  const handleError = useCallback(() => setError(true), []);

  let optimizedSrc = error ? fallback : src;
  if (width && optimizedSrc.includes("db.co/storage") && !error) {
    const separator = optimizedSrc.includes("?") ? "&" : "?";
    optimizedSrc = `${optimizedSrc}${separator}width=${width}&quality=75`;
  }

  const srcSet = !error && src ? buildSrcSet(src, [320, 480, 640, 800, 1024]) : undefined;
  const defaultSizes = sizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

  return (
    <img
      ref={imgRef}
      src={optimizedSrc || fallback}
      alt={alt}
      srcSet={srcSet}
      sizes={srcSet ? defaultSizes : undefined}
      className={className}
      style={{
        opacity: loaded ? 1 : 0,
        filter: loaded ? "blur(0)" : "blur(8px)",
        transform: loaded ? "scale(1)" : "scale(1.02)",
        transition: "opacity 200ms ease-out, filter 250ms ease-out, transform 250ms ease-out",
        ...(aspectRatio ? { aspectRatio } : {}),
      }}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
});
