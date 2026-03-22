import VerticalHubPage from "@/components/discovery/VerticalHubPage";
import { VERTICALS } from "@/lib/discovery/verticals";

export default function GroceryHub() {
  // Grocery is a subcategory of retail — show retail hub filtered to grocery
  const vertical = VERTICALS.find((v) => v.value === "retail")!;
  return <VerticalHubPage vertical={vertical} />;
}
