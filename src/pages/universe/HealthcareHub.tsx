import VerticalHubPage from "@/components/discovery/VerticalHubPage";
import { VERTICALS } from "@/lib/discovery/verticals";

export default function HealthcareHub() {
  const vertical = VERTICALS.find((v) => v.value === "healthcare")!;
  return <VerticalHubPage vertical={vertical} />;
}
