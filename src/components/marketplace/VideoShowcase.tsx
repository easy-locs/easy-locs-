/**
 * VideoShowcase — Inline video player for service cards and storefronts
 * Supports direct URLs (mp4, webm) and YouTube/Vimeo embeds.
 * PASS55 Block E: Seller/Video/Live
 */
import { useState } from "react";
import { Play, X } from "lucide-react";

interface VideoShowcaseProps {
  videoUrl: string;
  title?: string;
  /** Thumbnail override — otherwise shows play button overlay */
  thumbnailUrl?: string;
  className?: string;
}

/** Extract YouTube/Vimeo embed URL */
function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

export default function VideoShowcase({ videoUrl, title, thumbnailUrl, className = "" }: VideoShowcaseProps) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getEmbedUrl(videoUrl);
  const isDirect = isDirectVideo(videoUrl);

  if (!playing) {
    return (
      <button
        onClick={() => setPlaying(true)}
        className={`relative w-full aspect-video rounded-xl overflow-hidden group cursor-pointer ${className}`}
        style={{ background: "hsl(var(--muted))" }}
        aria-label={`Play video: ${title || "service video"}`}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title || "Video"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))" }}>
            <span className="text-xs text-muted-foreground">{title || "Video"}</span>
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ background: "hsl(var(--primary) / 0.9)" }}
          >
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden ${className}`}>
      {/* Close button */}
      <button
        onClick={() => setPlaying(false)}
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
        style={{ background: "hsl(0 0% 0% / 0.5)" }}
      >
        <X className="w-4 h-4 text-white" />
      </button>

      {embedUrl ? (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={title || "Video"}
        />
      ) : isDirect ? (
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          controls
          autoPlay
          playsInline
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <p className="text-xs text-muted-foreground">Unsupported video format</p>
        </div>
      )}
    </div>
  );
}
