/**
 * LiveShopping — Live stream shopping, social posts, influencer collabs
 * Seller: create live sessions, manage UGC, invite influencers
 * Buyer: view lives, post UGC, like posts
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Radio, Users, Heart, MessageCircle, Sparkles, Plus, Loader2, Eye, Camera, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
  catalogItems?: any[];
}

const LIVE_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-info/20 text-info",
  live: "bg-destructive/20 text-destructive animate-pulse",
  ended: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function LiveShopping({ shopId, mode, catalogItems = [] }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"live" | "ugc" | "influencers">("live");

  // Load live sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["live-sessions", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_live_sessions")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  // Load social posts (UGC)
  const { data: posts = [] } = useQuery({
    queryKey: ["social-posts-v2", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_social_posts")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  // Load influencer collabs (seller)
  const { data: collabs = [] } = useQuery({
    queryKey: ["influencer-collabs", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_influencer_collabs")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: mode === "seller",
  });

  // Create live session
  const [liveForm, setLiveForm] = useState({ title: "", description: "", scheduledAt: "" });
  const createLive = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_live_sessions").insert({
        shop_id: shopId, host_id: user!.id,
        title: liveForm.title, description: liveForm.description,
        scheduled_at: liveForm.scheduledAt || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
      setLiveForm({ title: "", description: "", scheduledAt: "" });
      toast.success("Live session scheduled");
    },
  });

  // Update live status
  const updateLiveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "live") updates.started_at = new Date().toISOString();
      if (status === "ended") updates.ended_at = new Date().toISOString();
      await (supabase as any).from("storefront_live_sessions").update(updates).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["live-sessions"] }); toast.success("Updated"); },
  });

  // Create UGC post (buyer)
  const [postForm, setPostForm] = useState({ content: "", postType: "review" });
  const createPost = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_social_posts").insert({
        shop_id: shopId, user_id: user!.id,
        content: postForm.content, caption: postForm.content,
        post_type: postForm.postType, status: "published",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-posts-v2"] });
      setPostForm({ content: "", postType: "review" });
      toast.success("Post shared!");
    },
  });

  // Like post
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data: existing } = await (supabase as any).from("storefront_social_likes")
        .select("id").eq("post_id", postId).eq("user_id", user!.id).maybeSingle();
      if (existing) {
        await (supabase as any).from("storefront_social_likes").delete().eq("id", existing.id);
      } else {
        await (supabase as any).from("storefront_social_likes").insert({ post_id: postId, user_id: user!.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-posts-v2"] }),
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Video className="h-4 w-4 text-destructive" /> Social & Live
        </h3>
        <div className="flex gap-1">
          {["live", "ugc", ...(mode === "seller" ? ["influencers"] : [])].map(v => (
            <Button key={v} size="sm" variant={tab === v ? "default" : "ghost"} className="text-[10px] h-6 px-2"
              onClick={() => setTab(v as any)}>{v === "live" ? "Live" : v === "ugc" ? "Posts" : "Creators"}</Button>
          ))}
        </div>
      </div>

      {/* LIVE SESSIONS */}
      {tab === "live" && (
        <div className="space-y-3">
          {mode === "seller" && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Schedule Live Session</h4>
                <Input placeholder="Title" value={liveForm.title}
                  onChange={e => setLiveForm(p => ({ ...p, title: e.target.value }))} className="text-xs h-8" />
                <Input type="datetime-local" value={liveForm.scheduledAt}
                  onChange={e => setLiveForm(p => ({ ...p, scheduledAt: e.target.value }))} className="text-xs h-8" />
                <Button size="sm" className="w-full h-7 text-xs" onClick={() => createLive.mutate()}
                  disabled={!liveForm.title.trim() || createLive.isPending}>
                  <Radio className="h-3 w-3 mr-1" /> Schedule Live
                </Button>
              </CardContent>
            </Card>
          )}

          {sessions.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No live sessions yet</CardContent></Card>
          ) : sessions.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {s.status === "live" && <Radio className="h-3 w-3 text-destructive animate-pulse" />}
                      <p className="text-xs font-semibold line-clamp-2 break-words leading-snug">{s.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[8px] ${LIVE_STATUS_COLORS[s.status] || ""}`}>{s.status}</Badge>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" /> {s.viewer_count || 0}
                      </span>
                      {s.scheduled_at && (
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(s.scheduled_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {mode === "seller" && s.status !== "ended" && (
                    <div className="flex gap-1">
                      {s.status === "scheduled" && (
                        <Button size="sm" variant="destructive" className="text-[9px] h-6 px-2"
                          onClick={() => updateLiveStatus.mutate({ id: s.id, status: "live" })}>
                          Go Live
                        </Button>
                      )}
                      {s.status === "live" && (
                        <Button size="sm" variant="outline" className="text-[9px] h-6 px-2"
                          onClick={() => updateLiveStatus.mutate({ id: s.id, status: "ended" })}>
                          End
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* UGC / SOCIAL POSTS */}
      {tab === "ugc" && (
        <div className="space-y-3">
          {mode === "buyer" && user && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Share your experience</h4>
                <div className="flex gap-2">
                  <Select value={postForm.postType} onValueChange={v => setPostForm(p => ({ ...p, postType: v }))}>
                    <SelectTrigger className="text-xs h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["review", "unboxing", "outfit", "haul", "tutorial", "other"].map(t => (
                        <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="What's on your mind?" value={postForm.content}
                  onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))} rows={2} className="text-xs" />
                <Button size="sm" className="w-full h-7 text-xs" onClick={() => createPost.mutate()}
                  disabled={!postForm.content.trim() || createPost.isPending}>
                  <Camera className="h-3 w-3 mr-1" /> Post
                </Button>
              </CardContent>
            </Card>
          )}

          {posts.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No posts yet — be the first!</CardContent></Card>
          ) : posts.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="secondary" className="text-[8px] capitalize">{p.post_type}</Badge>
                      <span className="text-[9px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                      {p.is_featured && <Badge className="text-[8px] bg-yellow-500/20 text-yellow-600">Featured</Badge>}
                    </div>
                    <p className="text-[11px] text-foreground">{p.content || p.caption}</p>
                    {p.photo_url && <img src={p.photo_url} alt="" className="mt-2 rounded-lg w-full max-h-40 object-cover" />}
                    <div className="flex items-center gap-3 mt-2">
                      <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                        onClick={() => user && likeMutation.mutate(p.id)}>
                        <Heart className="h-3 w-3" /> {p.likes_count || 0}
                      </button>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MessageCircle className="h-3 w-3" /> {p.comments_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* INFLUENCER COLLABS (seller only) */}
      {tab === "influencers" && mode === "seller" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Influencer Collaborations
              </h4>
              {collabs.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-4">No collaborations yet. Invite creators to promote your products.</p>
              ) : collabs.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-[11px] font-medium">{c.influencer_id?.slice(0, 8)}...</p>
                    <p className="text-[9px] text-muted-foreground">{c.commission_percent}% commission • {c.promo_code || "No code"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-[8px] capitalize">{c.status}</Badge>
                    <p className="text-[9px] text-primary font-medium mt-0.5">€{c.total_sales?.toFixed(0) || 0} sales</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
