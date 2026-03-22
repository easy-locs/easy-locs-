import VerticalHubPage from "@/components/discovery/VerticalHubPage";
import { VERTICALS } from "@/lib/discovery/verticals";

export default function RetailHub() {
  const vertical = VERTICALS.find((v) => v.value === "retail")!;
  return <VerticalHubPage vertical={vertical} />;
}
