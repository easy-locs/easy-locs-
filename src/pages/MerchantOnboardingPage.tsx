import {
  activateMerchantProfile,
  bulkImportMerchantMenuItems,
  createMerchantOnboardingProfile,
  createOnboardingSource,
  normalizeMerchantMenu,
} from "@/lib/onboarding/merchant-onboarding";

export default function MerchantOnboardingPage() {
  const runDemo = async () => {
    const source = await createOnboardingSource({
      sourceType: "manual",
      sourceName: "Admin import",
      payload: { channel: "sales-team" },
    });

    const profile = await createMerchantOnboardingProfile({
      sourceId: source.id,
      merchantName: "Pizza Times Marina",
      cuisineType: "Pizza",
      city: "Dubai",
      area: "Marina",
      deliveryRadiusKm: 7,
      activationMode: "semi_auto",
    });

    await bulkImportMerchantMenuItems({
      profileId: profile.id,
      items: [
        { categoryName: "Best Sellers", itemName: "Pepperoni Pizza", itemDescription: "Mozzarella, pepperoni, tomato sauce", price: 39, currency: "AED" },
        { categoryName: "Best Sellers", itemName: "Margherita Pizza", itemDescription: "Mozzarella, basil, tomato sauce", price: 32, currency: "AED" },
      ],
    });

    await normalizeMerchantMenu(profile.id);
    await activateMerchantProfile(profile.id);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Merchant Auto-Onboarding</h1>
        <p className="text-sm text-muted-foreground">Intake → menu import → normalize → activate</p>
      </div>
      <button onClick={runDemo} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Run onboarding demo
      </button>
    </div>
  );
}
