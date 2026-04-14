import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { merchantService } from "@/services/merchant.service";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantPromoBannerEditorPage() {
  useUiEngine("merchant-merchantpromobannereditorpage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: merchant, refetch, isError } = useQuery({
    queryKey: ["merchant-promo-banner-editor", merchantId],
    queryFn: () => merchantService.fetchMerchantById(merchantId),
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
      await merchantService.updateMerchant(merchantId, {
        promo_banner_title: title.trim() || null,
        promo_banner_subtitle: subtitle.trim() || null,
        promo_banner_image: imageUrl.trim() || null,
      });
      toast.success("Promo banner saved");
      refetch();
    } catch (err: any) {
      toast.error("Could not save banner");
    } finally {
      setSaving(false);
    }
  };

  if (isError) {
    return (
      <SubPageShell title="Promo Banner Editor" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)}>
        <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell title="Promo Banner Editor" subtitle="Homepage banner content" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)} noContentPad>
      <div className="px-4 pt-4 space-y-4">
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
    </SubPageShell>
  );
}
