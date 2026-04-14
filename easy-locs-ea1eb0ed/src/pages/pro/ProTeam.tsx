import { Users, Plus, Shield, Edit, Trash2, Mail } from 'lucide-react';
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

const ROLES = ['Owner', 'Admin', 'Manager', 'Staff', 'Agent'];

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'invited' | 'inactive';
  languages: string[];
}

const MEMBERS: TeamMember[] = [
  { id: '1', name: 'You (Owner)', role: 'Owner', email: 'owner@business.com', status: 'active', languages: ['English', 'French'] },
  { id: '2', name: 'Ahmed S.', role: 'Manager', email: 'ahmed@business.com', status: 'active', languages: ['Arabic', 'English'] },
  { id: '3', name: 'Lisa T.', role: 'Staff', email: 'lisa@business.com', status: 'invited', languages: ['English'] },
];

export default function ProTeam() {
  useUiEngine("pro-proteam");
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Team & Roles</h1>
          <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Manage team members and permissions</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: GOLD, border: 'none', borderRadius: 8, color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Invite Member
        </button>
      </div>

      <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 180px 100px 80px', padding: '12px 20px', borderBottom: `1px solid ${NAVY_LIGHT}`, gap: 12 }}>
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>MEMBER</span>
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>ROLE</span>
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>EMAIL</span>
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>STATUS</span>
          <span />
        </div>
        {MEMBERS.map(member => (
          <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 180px 100px 80px', padding: '16px 20px', borderBottom: `1px solid ${NAVY_LIGHT}`, gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>
                {member.name.charAt(0)}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{member.name}</div>
                <div style={{ color: 'hsl(220 20% 50%)', fontSize: 11 }}>{member.languages.join(', ')}</div>
              </div>
            </div>
            <div>
              <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: member.role === 'Owner' ? `${GOLD}15` : NAVY_LIGHT, color: member.role === 'Owner' ? GOLD : 'hsl(220 20% 65%)' }}>
                {member.role}
              </span>
            </div>
            <span style={{ color: 'hsl(220 20% 60%)', fontSize: 12 }}>{member.email}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: member.status === 'active' ? '#22c55e' : member.status === 'invited' ? GOLD : '#ef4444' }}>
              {member.status}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {member.role !== 'Owner' && (
                <>
                  <button style={{ background: 'transparent', border: 'none', color: 'hsl(220 20% 55%)', cursor: 'pointer' }}><Edit size={14} /></button>
                  <button style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, background: CARD_BG, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}` }}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} color={GOLD} /> Role Permissions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {ROLES.map(role => (
            <div key={role} style={{ background: NAVY_LIGHT, borderRadius: 8, padding: 14, textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{role}</div>
              <div style={{ color: 'hsl(220 20% 55%)', fontSize: 11, lineHeight: 1.5 }}>
                {role === 'Owner' && 'Full access'}
                {role === 'Admin' && 'All except billing'}
                {role === 'Manager' && 'Orders, team, catalog'}
                {role === 'Staff' && 'Orders, inbox'}
                {role === 'Agent' && 'Inbox only'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
