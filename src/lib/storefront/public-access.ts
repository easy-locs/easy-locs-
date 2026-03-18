import { supabase } from "@/integrations/supabase/client";

export async function getPublicStorefrontBySlug(publicSlug: string) {
  const { data, error } = await (supabase as any)
    .from("public_storefront_settings")
    .select("*, merchant_onboarding_profiles(*)")
    .eq("public_slug", publicSlug)
    .eq("is_public", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertPublicStorefrontSettings(params: {
  merchantProfileId: string;
  publicSlug: string;
  seoTitle?: string;
  seoDescription?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  isPublic?: boolean;
}) {
  const { data, error } = await (supabase as any)
    .from("public_storefront_settings")
    .upsert(
      {
        merchant_profile_id: params.merchantProfileId,
        public_slug: params.publicSlug,
        seo_title: params.seoTitle ?? null,
        seo_description: params.seoDescription ?? null,
        cover_image_url: params.coverImageUrl ?? null,
        logo_url: params.logoUrl ?? null,
        is_public: params.isPublic ?? true,
      },
      { onConflict: "merchant_profile_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
