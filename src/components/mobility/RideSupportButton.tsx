import React from "react";
import { eventBus } from "@/lib/core/event-bus";
import { Button } from "@/components/ui/button";
import { tc } from "@/lib/i18n-canonical";
import { LifeBuoy } from "lucide-react";

export function RideSupportButton({ jobId }: { jobId: string }) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() =>
        void eventBus.emit("support.open", {
          context: "ride",
          jobId,
        })
      }
    >
      <LifeBuoy className="w-4 h-4 mr-2" />
      {tc("ride.report_issue")}
    </Button>
  );
}
