/**
 * BoostSelectorWrapper — Default export wrapper for lazy loading.
 */
import { BoostSelector } from "./BoostSelector";

export default function BoostSelectorWrapper(props: React.ComponentProps<typeof BoostSelector>) {
  return <BoostSelector {...props} />;
}
