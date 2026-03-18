import { supabase } from "@/integrations/supabase/client";

export async function publishImportedMenuToCatalog(params: {
  workspaceId: string;
  profileId: string;
}) {
  const { data: importedItems, error: importError } = await supabase
    .from("merchant_menu_import_items")
    .select("*")
    .eq("profile_id", params.profileId)
    .order("created_at", { ascending: true });

  if (importError) throw importError;

  const categoryMap = new Map<string, string>();

  for (const item of importedItems ?? []) {
    const categoryName = (item.category_name as string)?.trim() || "Uncategorized";

    if (!categoryMap.has(categoryName)) {
      const { data: cat, error: catError } = await supabase
        .from("menu_categories" as any)
        .insert({
          workspace_id: params.workspaceId,
          merchant_profile_id: params.profileId,
          name: categoryName,
        } as any)
        .select("*")
        .single();

      if (catError) throw catError;
      categoryMap.set(categoryName, (cat as any).id);
    }

    const { error: itemError } = await supabase
      .from("menu_items" as any)
      .insert({
        workspace_id: params.workspaceId,
        merchant_profile_id: params.profileId,
        category_id: categoryMap.get(categoryName)!,
        name: item.item_name,
        description: item.item_description,
        price: item.price ?? 0,
        currency: item.currency ?? "AED",
        image_url: item.image_url,
      } as any);

    if (itemError) throw itemError;

    await supabase
      .from("merchant_menu_import_items")
      .update({ published: true })
      .eq("id", item.id);
  }

  return true;
}
