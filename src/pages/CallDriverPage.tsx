/**
 * CallDriverPage — /call/:threadId — Driver call screen with action options.
 */
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { Button } from "@/components/ui/button";

export default function CallDriverPage() {
  const { threadId } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <BackCard />

        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
            📞
          </div>

          <h1 className="text-lg font-bold text-foreground">Calling driver</h1>
          <p className="text-xs text-muted-foreground">
            Thread: {threadId ?? "—"}
          </p>

          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1 rounded-xl">
              Voice call
            </Button>
            <Button className="flex-1 rounded-xl">
              In-app call
            </Button>
            <Button variant="destructive" className="flex-1 rounded-xl">
              End
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
