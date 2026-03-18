/**
 * CallDriverPage — /call/:threadId — Placeholder for driver call screen.
 */
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { Phone } from "lucide-react";

export default function CallDriverPage() {
  const { threadId } = useParams();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 w-full">
        <BackCard />
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Calling driver…</h1>
          <p className="text-xs text-muted-foreground text-center">
            Thread: {threadId}
          </p>
        </div>
      </div>
    </div>
  );
}
