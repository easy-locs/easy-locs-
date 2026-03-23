import VerticalHubPage from "@/components/discovery/VerticalHubPage";
import { VERTICALS } from "@/lib/discovery/verticals";

export default function PropertyHub() {
  const vertical = VERTICALS.find((v) => v.value === "property")!;
  return <VerticalHubPage vertical={vertical} />;
}
