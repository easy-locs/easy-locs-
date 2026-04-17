import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

export default function OverviewSection() {
  return <SectionPlaceholder section={getSection("overview")} />;
}
