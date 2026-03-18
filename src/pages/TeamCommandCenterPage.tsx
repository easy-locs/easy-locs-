/**
 * TeamCommandCenterPage — Unified task management for disputes, payouts, moderation.
 */
import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";

export default function TeamCommandCenterPage() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("team_tasks" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: any) => setTasks(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <BackCard />
        <div>
          <h1 className="text-xl font-bold text-foreground">Team command center</h1>
          <p className="text-sm text-muted-foreground">One place for disputes, payouts, moderation and operations</p>
        </div>

        <div className="space-y-3">
          {tasks.map((task: any) => (
            <div key={task.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{task.title}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  task.status === "done" ? "bg-primary/10 text-primary" :
                  task.status === "in_progress" ? "bg-accent/10 text-accent-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {task.status}
                </span>
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {task.task_type} · {task.priority}
              </p>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No tasks yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
