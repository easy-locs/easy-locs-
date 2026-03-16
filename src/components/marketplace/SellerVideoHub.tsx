/**
 * SellerVideoHub — Video gallery for all service videos.
 * Lists all videos across services, with play/manage capabilities.
 * PASS55 Block E2: Seller Deep
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Play, Plus, ExternalLink, Film } from "lucide-react";
import VideoShowcase from "./VideoShowcase";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SellerVideoHubProps {
  services: any[];
}

export default function SellerVideoHub({ services }: SellerVideoHubProps) {
  const navigate = useNavigate();
  const [playingId, setPlayingId] = useState<string | null>(null);

  const videoServices = useMemo(
    () => services.filter((s) => s.video_url),
    [services]
  );

  if (videoServices.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-muted">
          <Film className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Aucune vidéo</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px] mx-auto">
            Ajoutez des vidéos à vos services pour augmenter l'engagement et les conversions.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/dashboard/activities?action=new")}
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un service avec vidéo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Vidéothèque</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            {videoServices.length}
          </span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 gap-3">
        {videoServices.map((svc, i) => (
          <motion.div
            key={svc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Video player or thumbnail */}
            {playingId === svc.id ? (
              <VideoShowcase
                videoUrl={svc.video_url}
                title={svc.title}
                thumbnailUrl={svc.photo_urls?.[0] || svc.photo_url}
              />
            ) : (
              <button
                onClick={() => setPlayingId(svc.id)}
                className="relative w-full aspect-video group"
                style={{ background: "hsl(var(--muted))" }}
              >
                {(svc.photo_urls?.[0] || svc.photo_url) ? (
                  <img
                    src={svc.photo_urls?.[0] || svc.photo_url}
                    alt={svc.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ background: "hsl(var(--primary) / 0.9)" }}>
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              </button>
            )}

            {/* Service info */}
            <div className="px-3 py-2.5 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{svc.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {svc.category} • {svc.price} {svc.currency}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={() => navigate(`/dashboard/activities?edit=${svc.id}`)}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
