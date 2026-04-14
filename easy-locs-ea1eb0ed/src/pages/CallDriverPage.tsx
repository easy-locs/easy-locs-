/**
 * CallDriverPage — /call/:threadId — Driver call screen with action options.
 */
import { useParams, useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function CallDriverPage() {
  useUiEngine("calldriverpage");
  const navigate = useNavigate();
  const { threadId } = useParams();

  return (
    <SubPageShell title="Call Driver" onBack={() => navigate(-1)}>
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
            📞
          </div>

          <h1 className="text-lg font-bold text-foreground">Calling driver</h1>
          <p className="text-xs text-muted-foreground">
            Secure Orbit call session · Thread: {threadId ?? "—"}
          </p>

          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1 rounded-xl">
              Voice
            </Button>
            <Button className="flex-1 rounded-xl">
              In-app
            </Button>
            <Button variant="destructive" className="flex-1 rounded-xl">
              End
            </Button>
          </div>
        </div>
      </div>
    </SubPageShell>
  );
}
