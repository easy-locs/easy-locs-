import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

export default function ApprovalsSection() {
  return <SectionPlaceholder section={getSection("approvals")} />;
}
