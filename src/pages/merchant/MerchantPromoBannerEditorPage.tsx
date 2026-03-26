import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantPromoBannerEditorPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: merchant, refetch } = useQuery({
    queryKey: ["merchant-promo-banner-editor", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_merchants")
        .select("*")
        .eq("id", merchantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!merchantId,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!merchant) return;
    setTitle((merchant as any).promo_banner_title ?? "");
    setSubtitle((merchant as any).promo_banner_subtitle ?? "");
    setImageUrl((merchant as any).promo_banner_image ?? "");
  }, [merchant]);

  const save = async () => {
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("seed_merchants")
        .update({
          promo_banner_title: title.trim() || null,
          promo_banner_subtitle: subtitle.trim() || null,
          promo_banner_image: imageUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchantId);

      if (error) throw error;
      toast.success("Promo banner saved");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not save banner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Promo Banner Editor</h1>
          <p className="text-xs text-muted-foreground">Homepage banner content</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Banner title"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Banner subtitle"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Banner image URL"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />

        {imageUrl ? (
          <img src={imageUrl} alt="Banner preview" className="w-full rounded-xl object-cover max-h-48" />
        ) : null}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Banner"}
        </button>
      </div>
    </div>
  );
}
