import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import * as teamRepo from "@/repositories/team-permissions.repository";
import { applyPermissionTemplate } from "@/lib/team/apply-permission-template";

export default function TeamPermissionsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    teamRepo.fetchTeamData().then(({ members: m, templates: t }) => {
      setMembers(m);
      setTemplates(t);
    });
  }, []);

  const apply = async (memberId: string, templateKey: string) => {
    await applyPermissionTemplate({ workspaceMemberId: memberId, templateKey });
    const data = await teamRepo.refreshMembers();
    setMembers(data);
  };

  return (
    <div className="app-mobile-page bg-background p-4">
      <BackCard />
      <h1 className="mt-4 text-xl font-bold text-foreground">Team permissions</h1>
      <p className="text-sm text-muted-foreground">Assign permission templates to workspace members</p>

      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{member.user_id}</p>
            <p className="text-xs text-muted-foreground">{member.role}</p>

            <div className="mt-2 flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => apply(member.id, tpl.template_key)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
