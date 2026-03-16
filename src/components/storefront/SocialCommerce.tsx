/**
 * SocialCommerce — Social feed for shops: share products, like, comment.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, Send, Loader2, Plus, Users, Image } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  shopId: string;
  catalogItems?: any[];
}

export default function SocialCommerce({ shopId, catalogItems = [] }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newCaption, setNewCaption] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["social-posts", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_social_posts")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: myLikes = [] } = useQuery({
    queryKey: ["social-likes", shopId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const postIds = posts.map((p: any) => p.id);
      if (!postIds.length) return [];
      const { data } = await (supabase as any)
        .from("storefront_social_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      return (data || []).map((d: any) => d.post_id);
    },
    enabled: !!user && posts.length > 0,
  });

  const createPost = async () => {
    if (!user || !newCaption.trim()) return;
    setPosting(true);
    const item = catalogItems.find(i => i.id === selectedItem);
    await (supabase as any).from("storefront_social_posts").insert({
      user_id: user.id,
      shop_id: shopId,
      item_id: selectedItem,
      post_type: selectedItem ? "product_share" : "share",
      caption: newCaption,
      photo_url: item?.photo_url || null,
    });
    setNewCaption("");
    setSelectedItem(null);
    setPosting(false);
    qc.invalidateQueries({ queryKey: ["social-posts", shopId] });
    toast.success("Posted!");
  };

  const toggleLike = async (postId: string) => {
    if (!user) return toast.error("Sign in to like");
    const liked = myLikes.includes(postId);
    if (liked) {
      await (supabase as any).from("storefront_social_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await (supabase as any).from("storefront_social_likes").insert({ post_id: postId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["social-posts", shopId] });
    qc.invalidateQueries({ queryKey: ["social-likes", shopId] });
  };

  const addComment = async (postId: string) => {
    if (!user || !commentText.trim()) return;
    await (supabase as any).from("storefront_social_comments").insert({
      post_id: postId,
      user_id: user.id,
      user_name: user.email?.split("@")[0] || "User",
      content: commentText,
    });
    setCommentText("");
    qc.invalidateQueries({ queryKey: ["social-posts", shopId] });
    qc.invalidateQueries({ queryKey: ["social-comments", postId] });
    toast.success("Comment added");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" /> Community Feed
      </h3>

      {/* New post */}
      {user && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Textarea
              value={newCaption}
              onChange={e => setNewCaption(e.target.value)}
              placeholder="Share something about this shop..."
              rows={2}
              className="text-xs resize-none"
            />
            <div className="flex items-center justify-between">
              <select
                value={selectedItem || ""}
                onChange={e => setSelectedItem(e.target.value || null)}
                className="text-[10px] bg-muted rounded-lg px-2 py-1 border-none max-w-[60%]"
              >
                <option value="">📎 Attach product (optional)</option>
                {catalogItems.map(item => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={createPost} disabled={posting || !newCaption.trim()}>
                {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-xs text-muted-foreground">No posts yet. Be the first!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <Card key={post.id}>
              <CardContent className="p-3">
                {post.photo_url && (
                  <div className="aspect-video rounded-lg overflow-hidden mb-2 bg-muted">
                    <img src={post.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <p className="text-xs text-foreground mb-2">{post.caption}</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Heart className={`h-3.5 w-3.5 ${myLikes.includes(post.id) ? "fill-red-500 text-red-500" : ""}`} />
                    {post.likes_count || 0}
                  </button>
                  <button
                    onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {post.comments_count || 0}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Comments section */}
                {showComments === post.id && (
                  <CommentsSection postId={post.id} onComment={(text) => { setCommentText(text); addComment(post.id); }} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentsSection({ postId, onComment }: { postId: string; onComment: (text: string) => void }) {
  const [text, setText] = useState("");
  const { data: comments = [] } = useQuery({
    queryKey: ["social-comments", postId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_social_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(20);
      return data || [];
    },
  });

  return (
    <div className="mt-2 pt-2 border-t border-border space-y-2">
      {comments.map((c: any) => (
        <div key={c.id} className="flex gap-2">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[8px] font-bold">{(c.user_name || "U")[0].toUpperCase()}</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-foreground">{c.user_name || "User"}</span>
            <p className="text-[11px] text-muted-foreground">{c.content}</p>
          </div>
        </div>
      ))}
      <div className="flex gap-1.5">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Comment..."
          className="h-7 text-[11px] flex-1"
          onKeyDown={e => { if (e.key === "Enter" && text.trim()) { onComment(text); setText(""); } }}
        />
        <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => { if (text.trim()) { onComment(text); setText(""); } }}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
