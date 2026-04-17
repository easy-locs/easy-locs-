import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

export default function CommandSection() {
  return <SectionPlaceholder section={getSection("command")} />;
}
