/**
 * /u/:userId — Public user profile deep-link.
 * No login required to view. CTA to chat or pay.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, QrCode, Store, ArrowLeft } from "lucide-react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, avatar_url, username, bio, city, country")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // Check if user has a shop
  const { data: shop } = useQuery({
    queryKey: ["user-shop", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, slug, name")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">User not found</p>
          <Link to="/discover">
            <Button variant="outline" size="sm"><ArrowLeft className="h-3 w-3 mr-1" /> Discover</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || "User";
  const isSelf = user?.id === userId;

  return (
    <>
      <SEOHead title={`${displayName} — Easy Locs`} description={profile.bio || `${displayName}'s profile`} />
      <div className="min-h-screen bg-background">
        <MobilePageHeader title="Profile" backPath="/discover" />

        <div className="max-w-md mx-auto px-4 pt-6 pb-24 space-y-6">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{
                background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : "hsl(var(--primary) / 0.15)",
                color: profile.avatar_url ? "transparent" : "hsl(var(--primary))",
              }}
            >
              {!profile.avatar_url && displayName[0]?.toUpperCase()}
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">{displayName}</h1>
              {profile.username && (
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
              )}
              {(profile.city || profile.country) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-muted-foreground text-center max-w-xs">{profile.bio}</p>
            )}
          </div>

          {/* Actions */}
          {!isSelf && (
            <div className="flex gap-2 justify-center">
              <Link to={user ? `/dashboard/communication?contact=${userId}` : `/login?redirect=/u/${userId}`}>
                <Button size="sm" className="gap-1.5">
                  <MessageCircle className="h-4 w-4" /> Chat
                </Button>
              </Link>
              <Link to={user ? `/dashboard/wallet?action=send&to=${userId}` : `/login?redirect=/u/${userId}`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Send className="h-4 w-4" /> Pay
                </Button>
              </Link>
            </div>
          )}

          {/* Shop link */}
          {shop && (
            <Link
              to={`/s/${shop.slug}`}
              className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{shop.name}</p>
                <p className="text-xs text-muted-foreground">View shop</p>
              </div>
            </Link>
          )}

          {/* QR section */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 border border-border">
            <QrCode className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-[10px] text-muted-foreground">Scan to connect</p>
          </div>
        </div>
      </div>
    </>
  );
}
