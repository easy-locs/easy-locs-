import VerticalHubPage from "@/components/discovery/VerticalHubPage";
import { VERTICALS } from "@/lib/discovery/verticals";

export default function ServicesHub() {
  const vertical = VERTICALS.find((v) => v.value === "services")!;
  return <VerticalHubPage vertical={vertical} />;
}
