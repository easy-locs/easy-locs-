import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

export default function AgentsSection() {
  return <SectionPlaceholder section={getSection("agents")} />;
}
