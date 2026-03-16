/**
 * OrgMemberManager — Manage organization members, roles, invitations.
 * PASS55 Block H: Admin / Audit
 *
 * Features:
 * - List all org members with roles
 * - Change member roles (owner/admin/agent/staff/accountant/member)
 * - Remove members
 * - Invite new members
 * - RBAC: only admin+ can manage
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Shield, UserPlus, MoreHorizontal, Trash2,
  Crown, ShieldCheck, UserCog, Briefcase, Calculator, User,
  Mail, Check, X, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

const ROLES = [
  { value: "owner", label: "Owner", icon: Crown, color: "hsl(38 92% 50%)" },
  { value: "admin", label: "Admin", icon: ShieldCheck, color: "hsl(262 83% 58%)" },
  { value: "agent", label: "Agent", icon: UserCog, color: "hsl(199 89% 48%)" },
  { value: "staff", label: "Staff", icon: Briefcase, color: "hsl(142 76% 36%)" },
  { value: "accountant", label: "Comptable", icon: Calculator, color: "hsl(25 95% 53%)" },
  { value: "member", label: "Membre", icon: User, color: "hsl(var(--muted-foreground))" },
] as const;

type OrgRole = typeof ROLES[number]["value"];

interface OrgMember {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: { name: string | null; email: string | null; first_name: string | null; last_name: string | null };
}

export default function OrgMemberManager() {
  const { user, orgId } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<OrgRole | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviting, setInviting] = useState(false);
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);

  const canManage = myRole === "owner" || myRole === "admin";

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const { data: membersData } = await supabase
      .from("org_members")
      .select("id, user_id, role, created_at")
      .eq("org_id", orgId)
      .order("created_at");

    if (!membersData) { setLoading(false); return; }

    // Fetch profiles
    const userIds = membersData.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, first_name, last_name")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const enriched = membersData.map((m) => ({
      ...m,
      role: m.role as OrgRole,
      profile: profileMap.get(m.user_id) || undefined,
    }));

    setMembers(enriched);
    const me = enriched.find((m) => m.user_id === user?.id);
    setMyRole((me?.role as OrgRole) || null);
    setLoading(false);
  }, [orgId, user?.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const changeRole = async (memberId: string, newRole: OrgRole) => {
    const { error } = await supabase
      .from("org_members")
      .update({ role: newRole } as any)
      .eq("id", memberId);

    if (error) {
      toast.error("Erreur lors du changement de rôle");
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    setRoleMenuId(null);
    haptic("success");
    toast.success(`Rôle mis à jour: ${ROLES.find((r) => r.value === newRole)?.label}`);
  };

  const removeMember = async (member: OrgMember) => {
    if (member.role === "owner") {
      toast.error("Impossible de retirer le propriétaire");
      return;
    }
    if (!confirm(`Retirer ${member.profile?.full_name || member.profile?.email || "ce membre"} de l'organisation ?`)) return;

    const { error } = await supabase.from("org_members").delete().eq("id", member.id);
    if (error) {
      toast.error("Erreur lors du retrait");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    haptic("warning");
    toast.success("Membre retiré");
  };

  const sendInvite = async () => {
    if (!orgId || !user?.id || !inviteEmail.trim()) return;
    setInviting(true);

    const { error } = await supabase.from("collaboration_invitations").insert({
      org_id: orgId,
      invited_by: user.id,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
    } as any);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Invitation déjà envoyée" : "Erreur d'envoi");
    } else {
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail("");
      setShowInvite(false);
    }
    setInviting(false);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Équipe</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            {members.length}
          </span>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => { setShowInvite(true); haptic("light"); }}>
            <UserPlus className="w-3.5 h-3.5" /> Inviter
          </Button>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {members.map((member) => {
          const roleCfg = ROLES.find((r) => r.value === member.role) || ROLES[5];
          const RoleIcon = roleCfg.icon;
          const isMe = member.user_id === user?.id;
          const showMenu = roleMenuId === member.id;

          return (
            <motion.div
              key={member.id}
              layout
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ background: `${roleCfg.color}15`, color: roleCfg.color }}>
                {member.profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {member.profile?.full_name || member.profile?.email || "Utilisateur"}
                  </p>
                  {isMe && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      Vous
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {member.profile?.email || "—"}
                </p>
              </div>

              {/* Role badge */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (canManage && member.role !== "owner") {
                      setRoleMenuId(showMenu ? null : member.id);
                      haptic("light");
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                  style={{
                    background: `${roleCfg.color}12`,
                    color: roleCfg.color,
                    border: `1px solid ${roleCfg.color}25`,
                    cursor: canManage && member.role !== "owner" ? "pointer" : "default",
                  }}
                >
                  <RoleIcon className="w-3 h-3" />
                  {roleCfg.label}
                  {canManage && member.role !== "owner" && <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
                </button>

                {/* Role dropdown */}
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      className="absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-xl overflow-hidden"
                      style={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)",
                      }}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                    >
                      {ROLES.filter((r) => r.value !== "owner").map((r) => (
                        <button
                          key={r.value}
                          onClick={() => changeRole(member.id, r.value)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                          style={{
                            color: member.role === r.value ? r.color : "hsl(var(--foreground))",
                            fontWeight: member.role === r.value ? 600 : 400,
                          }}
                        >
                          <r.icon className="w-3 h-3" style={{ color: r.color }} />
                          {r.label}
                          {member.role === r.value && <Check className="w-3 h-3 ml-auto" />}
                        </button>
                      ))}
                      <div className="border-t border-border" />
                      <button
                        onClick={() => removeMember(member)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Retirer
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Inviter un membre
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="collaborateur@email.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Rôle</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {ROLES.filter((r) => r.value !== "owner").map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setInviteRole(r.value)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-all"
                    style={{
                      background: inviteRole === r.value ? `${r.color}12` : "hsl(var(--muted) / 0.5)",
                      color: inviteRole === r.value ? r.color : "hsl(var(--muted-foreground))",
                      border: `1px solid ${inviteRole === r.value ? `${r.color}30` : "transparent"}`,
                    }}
                  >
                    <r.icon className="w-3.5 h-3.5" />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!inviteEmail.trim() || inviting}
              onClick={sendInvite}
            >
              <Mail className="w-4 h-4" />
              {inviting ? "Envoi…" : "Envoyer l'invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
