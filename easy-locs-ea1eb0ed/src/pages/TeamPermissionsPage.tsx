import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as teamRepo from "@/repositories/team-permissions.repository";
import { applyPermissionTemplate } from "@/lib/team/apply-permission-template";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function TeamPermissionsPage() {
  useUiEngine("teampermissionspage");
  const navigate = useNavigate();
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
    <SubPageShell title="Team permissions" onBack={() => navigate(-1)}>
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
    </SubPageShell>
  );
}
