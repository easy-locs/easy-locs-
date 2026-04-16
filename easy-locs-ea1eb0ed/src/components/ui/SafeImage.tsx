import { useState, useCallback, type ImgHTMLAttributes } from "react";

const FALLBACK_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f0f0f0"/><g transform="translate(200,150)"><rect x="-40" y="-30" width="80" height="60" rx="8" fill="#d0d0d0"/><circle cx="0" cy="-8" r="12" fill="#b0b0b0"/><polygon points="-30,20 0,-5 30,20" fill="#b0b0b0"/></g></svg>`)}`;

interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  fallbackSrc?: string;
  fallbackClassName?: string;
}

export function SafeImage({
  src,
  alt = "",
  fallbackSrc,
  fallbackClassName,
  className,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleError = useCallback(() => {
    if (!failed) {
      setFailed(true);
      setCurrentSrc(fallbackSrc ?? FALLBACK_SVG);
    }
  }, [failed, fallbackSrc]);

  const effectiveSrc = !src || src === "" ? (fallbackSrc ?? FALLBACK_SVG) : (failed ? currentSrc : src);

  return (
    <img
      {...props}
      src={effectiveSrc}
      alt={alt}
      className={failed ? (fallbackClassName ?? className) : className}
      onError={handleError}
      loading="lazy"
    />
  );
}

export function safeI18nFallback(key: string, value: string | undefined | null): string {
  if (value && value !== key) return value;
  if (import.meta.env?.DEV) return `[missing: ${key}]`;
  return "";
}
