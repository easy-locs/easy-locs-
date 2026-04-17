import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

export default function MasterSection() {
  const navigate = useNavigate();
  return (
    <SectionPlaceholder section={getSection("master")}>
      <div className="mx-auto flex max-w-md flex-col items-start gap-3 rounded-xl border border-border/40 bg-card/40 p-6">
        <h2 className="text-sm font-semibold">Legacy Master Control</h2>
        <p className="text-xs text-muted-foreground">
          The previous admin index is preserved as a fallback. New work happens inside the
          unified Control Plane sections.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/admin/master-control")}
        >
          <ExternalLink className="h-4 w-4" />
          Open legacy Master Control
        </Button>
      </div>
    </SectionPlaceholder>
  );
}
