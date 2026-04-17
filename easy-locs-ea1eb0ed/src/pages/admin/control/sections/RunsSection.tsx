import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

export default function RunsSection() {
  return <SectionPlaceholder section={getSection("runs")} />;
}
