import { useState, useEffect } from "react";
import { Star, Loader2, MessageCircle } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import * as tenantRepo from "@/repositories/tenant-portal.repository";
import { useToast } from "@/hooks/use-toast";

const TenantReviews = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const tenant = await tenantRepo.fetchTenantInfo(user.id);
      if (tenant) {
        setTenantId(tenant.id);
        setOrgId(tenant.org_id);
        setPropertyId(tenant.property_id);
        const data = await tenantRepo.fetchTenantReviews(tenant.id);
        setReviews(data);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSubmit = async () => {
    if (!tenantId || !orgId || !user) return;
    setSubmitting(true);

    if (editingId) {
      const { error } = await supabase
        .from("reviews")
        .update({ rating, comment, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: t("reviews.updated") });
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from("reviews").insert({
        org_id: orgId,
        property_id: propertyId,
        tenant_id: tenantId,
        reviewer_user_id: user.id,
        rating,
        comment,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: t("reviews.submitted") });
      }
    }

    setComment("");
    setRating(5);
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setReviews(data || []);
    setSubmitting(false);
  };

  const handleEdit = (review: any) => {
    setEditingId(review.id);
    setRating(review.rating);
    setComment(review.comment || "");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { toast({ title: t("page.common.error") || "Error", description: error.message, variant: "destructive" }); return; }
    setReviews(reviews.filter((r) => r.id !== id));
    toast({ title: t("reviews.delete") });
  };

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("reviews.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("reviews.subtitle")}</p>

        {/* Submit / Edit form */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-foreground mb-4">
            {editingId ? t("reviews.edit") : t("reviews.your_review")}
          </h2>

          {/* Star rating */}
          <div className="flex items-center gap-1 mb-4">
            <span className="text-sm text-muted-foreground mr-2">{t("reviews.rating")}:</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)} className="focus:outline-none">
                <Star
                  className={`h-6 w-6 transition-colors ${s <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                />
              </button>
            ))}
            <span className="text-sm text-muted-foreground ml-2">{rating} {t("reviews.stars")}</span>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("reviews.comment")}
            rows={3}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-4 resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting || !comment.trim()}
            className="bg-accent text-accent-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("reviews.submit")}
          </button>
        </div>

        {/* Reviews list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("reviews.no_reviews")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s <= r.rating ? "fill-warning text-warning" : "text-muted-foreground/20"}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(r)}
                      className="text-xs text-accent hover:underline"
                    >
                      {t("reviews.edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      {t("reviews.delete")}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-foreground">{r.comment}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>

                {r.landlord_reply && (
                  <div className="mt-3 pl-4 border-l-2 border-accent/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageCircle className="h-3.5 w-3.5 text-accent" />
                      <span className="text-xs font-medium text-accent">{t("reviews.reply")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.landlord_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantReviews;
