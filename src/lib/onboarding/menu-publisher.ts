/**
 * menu-publisher — Publishes imported merchant menu rows into live menu_items.
 */
import { supabase } from "@/integrations/supabase/client";

type PublishMenuParams = {
  userId?: string;
  workspaceId?: string | null;
  profileId?: string | null;
};

async function resolveMerchantProfile(params: PublishMenuParams) {
  if (params.profileId) {
    return { profileId: params.profileId, workspaceId: params.workspaceId ?? null };
  }

  if (!params.userId) {
    throw new Error("Missing user context for menu publication.");
  }

  const { data: storefront } = await (supabase as any)
    .from("storefront_pages")
    .select("merchant_profile_id, org_id")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (storefront?.merchant_profile_id) {
    return {
      profileId: storefront.merchant_profile_id as string,
      workspaceId: params.workspaceId ?? storefront.org_id ?? null,
    };
  }

  const { data: profile } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("id, workspace_id")
    .eq("claimed_by", params.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile?.id) {
    throw new Error("No merchant profile found for this account.");
  }

  return {
    profileId: profile.id as string,
    workspaceId: params.workspaceId ?? profile.workspace_id ?? null,
  };
}

export async function publishMenu(shopId: string) {
  const { data: shop } = await (supabase as any)
    .from("storefront_pages")
    .select("merchant_profile_id, org_id")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop?.merchant_profile_id) {
    throw new Error("This shop is not linked to a merchant profile.");
  }

  return publishImportedMenuToCatalog({
    profileId: shop.merchant_profile_id,
    workspaceId: shop.org_id ?? null,
  });
}

export async function publishImportedMenuToCatalog(params: PublishMenuParams = {}) {
  const { profileId, workspaceId } = await resolveMerchantProfile(params);

  const { data: importedRows, error: importError } = await (supabase as any)
    .from("merchant_menu_import_items")
    .select("id, item_name, item_description, image_url, price, currency, published")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (importError) throw importError;

  const pendingRows = (importedRows || []).filter((row: any) => !row.published);
  if (!pendingRows.length) {
    return { profileId, importedCount: importedRows?.length ?? 0, createdCount: 0, skippedCount: 0 };
  }

  const { data: existingRows, error: existingError } = await (supabase as any)
    .from("menu_items")
    .select("id, name")
    .eq("merchant_profile_id", profileId);

  if (existingError) throw existingError;

  const existingNames = new Set(
    (existingRows || []).map((row: any) => String(row.name || "").trim().toLowerCase()).filter(Boolean)
  );

  const itemsToCreate = pendingRows
    .filter((row: any) => !existingNames.has(String(row.item_name || "").trim().toLowerCase()))
    .map((row: any, index: number) => ({
      merchant_profile_id: profileId,
      workspace_id: workspaceId,
      name: row.item_name,
      description: row.item_description,
      image_url: row.image_url,
      price: row.price,
      currency: row.currency ?? "AED",
      is_available: true,
      sort_order: index,
    }));

  if (itemsToCreate.length > 0) {
    const { error: insertError } = await (supabase as any)
      .from("menu_items")
      .insert(itemsToCreate);

    if (insertError) throw insertError;
  }

  const publishedIds = pendingRows.map((row: any) => row.id);
  if (publishedIds.length > 0) {
    const { error: updateImportError } = await (supabase as any)
      .from("merchant_menu_import_items")
      .update({ published: true, normalized: true })
      .in("id", publishedIds);

    if (updateImportError) throw updateImportError;
  }

  const totalMenuItems = (existingRows?.length ?? 0) + itemsToCreate.length;
  await (supabase as any)
    .from("storefront_pages")
    .update({ has_menu: totalMenuItems > 0, products_count: totalMenuItems })
    .eq("merchant_profile_id", profileId);

  return {
    profileId,
    importedCount: pendingRows.length,
    createdCount: itemsToCreate.length,
    skippedCount: pendingRows.length - itemsToCreate.length,
  };
}
