import { useState, useCallback, memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  /** Supabase storage images support width/height transforms */
  width?: number;
  /** Priority loading — disables lazy loading for above-the-fold images */
  priority?: boolean;
  /** Responsive sizes attribute for srcset */
  sizes?: string;
}

/** Generate srcset for Supabase storage images at multiple widths */
function buildSrcSet(src: string, widths: number[]): string | undefined {
  if (!src.includes("supabase.co/storage")) return undefined;
  const sep = src.includes("?") ? "&" : "?";
  return widths
    .map(w => `${src}${sep}width=${w}&quality=75 ${w}w`)
    .join(", ");
}

/**
 * Optimized image component with:
 * - Lazy loading (native) with priority override
 * - Responsive srcset for Supabase images
 * - Fade-in on load
 * - Fallback on error
 * - Supabase image transforms for thumbnails
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = "",
  fallback = "/placeholder.svg",
  width,
  priority = false,
  sizes,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  // Apply Supabase storage transform for thumbnails
  let optimizedSrc = error ? fallback : src;
  if (width && optimizedSrc.includes("supabase.co/storage") && !error) {
    const separator = optimizedSrc.includes("?") ? "&" : "?";
    optimizedSrc = `${optimizedSrc}${separator}width=${width}&quality=75`;
  }

  // Build responsive srcset for Supabase images
  const srcSet = !error && src ? buildSrcSet(src, [320, 480, 640, 800, 1024]) : undefined;
  const defaultSizes = sizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

  return (
    <img
      src={optimizedSrc || fallback}
      alt={alt}
      srcSet={srcSet}
      sizes={srcSet ? defaultSizes : undefined}
      className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
});
