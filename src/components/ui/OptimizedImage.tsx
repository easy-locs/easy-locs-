import { useState, useCallback, memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  /** Supabase storage images support width/height transforms */
  width?: number;
}

/**
 * Optimized image component with:
 * - Lazy loading (native)
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

  return (
    <img
      src={optimizedSrc || fallback}
      alt={alt}
      className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
});
