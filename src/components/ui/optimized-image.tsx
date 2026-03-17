/**
 * OptimizedImage — PASS146: Lazy-loaded image with fade-in and error fallback.
 * Use `priority` for above-the-fold hero images.
 */
import { useState, memo, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  fallback?: string;
  aspectRatio?: string;
  priority?: boolean;
}

export const OptimizedImage = memo(function OptimizedImage({
  src, alt, className, fallback, aspectRatio, priority = false, ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgSrc = error && fallback ? fallback : src;

  return (
    <div
      className={cn("overflow-hidden bg-muted", !loaded && !priority && "animate-pulse", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt || ""}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            loaded || priority ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
    </div>
  );
});
