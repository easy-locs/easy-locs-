/**
 * AdvancedReviews — Photo/video reviews, Q&A, helpful votes, verified buyer badges.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, MessageSquare, CheckCircle, Camera, Loader2, Plus, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  itemId?: string;
  mode: "seller" | "buyer";
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange?.(i)} className="p-0" disabled={!onChange}>
          <Star className={`h-4 w-4 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

export default function AdvancedReviews({ shopId, itemId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [writing, setWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [askingQ, setAskingQ] = useState(false);
  const [question, setQuestion] = useState("");
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["storefront-reviews", shopId, itemId],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_reviews").select("*").eq("shop_id", shopId).eq("status", "published");
      if (itemId) q = q.eq("item_id", itemId);
      const { data } = await q.order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["product-questions", shopId, itemId],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_product_questions").select("*").eq("shop_id", shopId);
      if (itemId) q = q.eq("item_id", itemId);
      const { data } = await q.order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!shopId,
  });

  const writeReview = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) throw new Error("Write a review");
      await (supabase as any).from("storefront_reviews").insert({
        shop_id: shopId, item_id: itemId || null, user_id: user!.id, rating, title: title || null, comment,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storefront-reviews"] }); toast.success("Review posted!"); setWriting(false); setComment(""); setTitle(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const voteHelpful = useMutation({
    mutationFn: async (reviewId: string) => {
      await (supabase as any).from("storefront_review_votes").upsert({ review_id: reviewId, user_id: user!.id, helpful: true }, { onConflict: "review_id,user_id" });
      await (supabase as any).from("storefront_reviews").update({ helpful_count: reviews.find((r: any) => r.id === reviewId)?.helpful_count + 1 || 1 }).eq("id", reviewId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storefront-reviews"] }),
  });

  const askQuestion = useMutation({
    mutationFn: async () => {
      if (!question.trim() || !itemId) throw new Error("Enter a question");
      await (supabase as any).from("storefront_product_questions").insert({ shop_id: shopId, item_id: itemId, user_id: user!.id, question });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["product-questions"] }); toast.success("Question posted!"); setAskingQ(false); setQuestion(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const answerQuestion = useMutation({
    mutationFn: async () => {
      if (!answer.trim() || !answeringId) return;
      await (supabase as any).from("storefront_product_questions").update({ answer, answered_by: user!.id, answered_at: new Date().toISOString(), status: "answered" }).eq("id", answeringId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["product-questions"] }); toast.success("Answered!"); setAnsweringId(null); setAnswer(""); },
  });

  const respondToReview = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      await (supabase as any).from("storefront_reviews").update({ seller_response: response, seller_responded_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storefront-reviews"] }); toast.success("Response posted!"); },
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";

  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" /> Reviews & Q&A
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black">{avgRating}</span>
            <StarRating value={Math.round(parseFloat(avgRating))} />
            <span className="text-[10px] text-muted-foreground">({reviews.length})</span>
          </div>
        </div>

        {/* Write review */}
        {mode === "buyer" && user && !writing && (
          <Button size="sm" variant="outline" className="h-7 text-[10px] w-full" onClick={() => setWriting(true)}>
            <Plus className="h-3 w-3 mr-1" /> Write a Review
          </Button>
        )}
        {writing && (
          <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
            <StarRating value={rating} onChange={setRating} />
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Review title (optional)" className="h-8 text-xs" />
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Your review..." className="text-xs" rows={3} />
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs flex-1" disabled={writeReview.isPending} onClick={() => writeReview.mutate()}>
                {writeReview.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Post Review
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setWriting(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No reviews yet</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r.id} className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} />
                  {r.verified_purchase && <Badge className="text-[8px] bg-success/10 text-success"><CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Verified</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.title && <p className="text-xs font-semibold">{r.title}</p>}
                <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>
                {r.photo_urls?.length > 0 && (
                  <div className="flex gap-1">{r.photo_urls.map((url: string, i: number) => <img key={i} src={url} className="w-12 h-12 rounded object-cover" />)}</div>
                )}
                <div className="flex items-center gap-2">
                  {user && mode === "buyer" && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => voteHelpful.mutate(r.id)}>
                      <ThumbsUp className="h-3 w-3 mr-1" /> Helpful ({r.helpful_count || 0})
                    </Button>
                  )}
                </div>
                {r.seller_response && (
                  <div className="ml-4 p-2 rounded-lg bg-primary/5 border-l-2 border-primary">
                    <p className="text-[10px] font-semibold text-primary mb-0.5">Seller Response</p>
                    <p className="text-[10px] text-muted-foreground">{r.seller_response}</p>
                  </div>
                )}
                {mode === "seller" && !r.seller_response && (
                  <div className="ml-4">
                    <Input placeholder="Reply to review..." className="h-7 text-[10px]"
                      onKeyDown={e => { if (e.key === "Enter") { respondToReview.mutate({ id: r.id, response: (e.target as HTMLInputElement).value }); } }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Q&A Section */}
        {itemId && (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Questions & Answers</h4>
              {mode === "buyer" && user && !askingQ && (
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setAskingQ(true)}>Ask a question</Button>
              )}
            </div>
            {askingQ && (
              <div className="flex gap-2">
                <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Your question..." className="h-8 text-xs flex-1" />
                <Button size="sm" className="h-8" disabled={askQuestion.isPending} onClick={() => askQuestion.mutate()}>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            )}
            {questions.map((q: any) => (
              <div key={q.id} className="p-2.5 rounded-lg bg-muted/20 space-y-1.5">
                <p className="text-xs font-medium">Q: {q.question}</p>
                {q.answer ? (
                  <p className="text-xs text-muted-foreground ml-3">A: {q.answer}</p>
                ) : mode === "seller" ? (
                  answeringId === q.id ? (
                    <div className="flex gap-2 ml-3">
                      <Input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer..." className="h-7 text-[10px] flex-1" />
                      <Button size="sm" className="h-7 text-[10px]" onClick={() => answerQuestion.mutate()}>Answer</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-3" onClick={() => setAnsweringId(q.id)}>Answer</Button>
                  )
                ) : (
                  <p className="text-[10px] text-muted-foreground ml-3 italic">Awaiting answer...</p>
                )}
              </div>
            ))}
            {questions.length === 0 && <p className="text-[10px] text-muted-foreground text-center">No questions yet</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
