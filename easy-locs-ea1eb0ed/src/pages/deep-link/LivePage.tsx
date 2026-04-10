/**
 * /live/:liveId — Public live stream deep-link.
 * Preview-first, no login required to watch.
 * Foundation page — will connect to real live infrastructure later.
 */
import { useParams, Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Video, ShoppingCart, MessageCircle, ArrowLeft, Users } from "lucide-react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";

export default function LivePage() {
  const { liveId } = useParams<{ liveId: string }>();

  return (
    <>
      <SEOHead title="Live — Easy Locs" description="Watch live streams and shop in real-time" />
      <div className="app-mobile-page bg-background">
        <MobilePageHeader title="Live" backTo="/discover" />

        <div className="max-w-md mx-auto px-4 pt-6 pb-24 space-y-6">
          {/* Live preview placeholder */}
          <div className="aspect-[9/16] rounded-2xl bg-muted/30 border border-border flex flex-col items-center justify-center gap-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
            <Video className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center z-10">
              <p className="text-sm font-semibold text-foreground">Live stream</p>
              <p className="text-xs text-muted-foreground">Stream #{liveId?.slice(0, 8)}</p>
            </div>

            {/* Viewer count mock */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/90 text-destructive-foreground z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
              <span className="text-[10px] font-bold">LIVE</span>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-background/60 backdrop-blur-sm z-10">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">—</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1 h-11 gap-2">
              <Video className="h-4 w-4" /> Watch
            </Button>
            <Button variant="outline" className="h-11 gap-2">
              <ShoppingCart className="h-4 w-4" /> Shop
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Live commerce coming soon — buy products directly during live streams.
          </p>
        </div>
      </div>
    </>
  );
}
